CREATE OR REPLACE FUNCTION public.playbet_public_lp_url(
  _domain text,
  _route text,
  _instance_slug text,
  _lp_mode text,
  _influencer_id uuid,
  _campanha_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _base text;
  _clean_route text;
  _out text;
BEGIN
  IF _instance_slug IS NULL OR _instance_slug = '' THEN
    RETURN NULL;
  END IF;

  _base := trim(COALESCE(NULLIF(_domain, ''), 'oportunidades.playbet.app.br'));
  _base := regexp_replace(_base, '/+$', '');
  IF _base !~* '^https?://' THEN
    _base := 'https://' || _base;
  END IF;

  _clean_route := trim(COALESCE(_route, ''));

  IF _clean_route = '' OR _clean_route = '/' THEN
    _out := _base;
  ELSIF _clean_route ~* '^https?://' THEN
    _out := regexp_replace(_clean_route, '/+$', '');
  ELSIF left(_clean_route, 1) = '?' THEN
    _out := _base || _clean_route;
  ELSE
    _out := _base || CASE WHEN left(_clean_route, 1) = '/' THEN _clean_route ELSE '/' || _clean_route END;
  END IF;

  _out := public.playbet_append_url_param(_out, 'ref', _instance_slug, false);
  _out := public.playbet_append_url_param(_out, 'sub2', _influencer_id::text, false);
  _out := public.playbet_append_url_param(_out, 'sub3', _campanha_id::text, false);
  RETURN _out;
END;
$$;

WITH computed AS (
  SELECT tl.id,
         COALESCE(tl.landing_page_id, lpi.landing_page_id) AS effective_landing_page_id,
         public.playbet_public_lp_url(lp.domain, lp.route, lpi.slug, lpi.lp_mode, tl.influencer_id, tl.campanha_id) AS share_url
  FROM public.tracking_links tl
  JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  LEFT JOIN public.landing_pages lp ON lp.id = COALESCE(tl.landing_page_id, lpi.landing_page_id)
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.tracking_links tl
   SET final_url = computed.share_url,
       use_lp = true,
       lp_auto_generated = true,
       landing_page_id = COALESCE(tl.landing_page_id, computed.effective_landing_page_id)
FROM computed
WHERE computed.id = tl.id
  AND computed.share_url IS NOT NULL
  AND (tl.final_url IS DISTINCT FROM computed.share_url
       OR tl.use_lp IS DISTINCT FROM true
       OR tl.lp_auto_generated IS DISTINCT FROM true
       OR tl.landing_page_id IS DISTINCT FROM COALESCE(tl.landing_page_id, computed.effective_landing_page_id));

WITH computed AS (
  SELECT tl.id,
         tl.landing_page_id,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url, ''), NULLIF(lpi.affiliate_link, ''), NULLIF(tl.short_url, '')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url,
         tl.game_icon_url
  FROM public.tracking_links tl
  LEFT JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.lp_opportunities opp
   SET destination_url = COALESCE(computed.affiliate_url, opp.destination_url),
       landing_page_id = COALESCE(opp.landing_page_id, computed.landing_page_id),
       game_thumb_url = COALESCE(opp.game_thumb_url, computed.game_icon_url),
       metadata = COALESCE(opp.metadata, '{}'::jsonb) || jsonb_build_object(
         'game_icon_url', COALESCE(computed.game_icon_url, opp.metadata->>'game_icon_url'),
         'image_url', COALESCE(computed.game_icon_url, opp.metadata->>'image_url'),
         'source', COALESCE(opp.metadata->>'source', 'link_autopipeline'),
         'synced_at', now()
       ),
       updated_at = now()
FROM computed
WHERE computed.id = opp.tracking_link_id
  AND COALESCE((opp.metadata->>'auto')::boolean, false) = true;