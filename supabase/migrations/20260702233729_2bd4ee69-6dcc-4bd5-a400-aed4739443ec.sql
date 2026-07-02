ALTER TABLE public.clicks
  ADD COLUMN IF NOT EXISTS click_id text,
  ADD COLUMN IF NOT EXISTS landing_page_instance_id uuid REFERENCES public.landing_page_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_link_id uuid REFERENCES public.tracking_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clicks_click_id ON public.clicks(click_id);
CREATE INDEX IF NOT EXISTS idx_clicks_lpi ON public.clicks(landing_page_instance_id);
CREATE INDEX IF NOT EXISTS idx_clicks_tracking_link ON public.clicks(tracking_link_id);

CREATE OR REPLACE FUNCTION public.sync_click_to_tracking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tl_id uuid;
  _platform_account_id uuid;
  _platform_id uuid;
  _campanha_id uuid;
  _conteudo_id uuid;
  _utm_id uuid;
  _lpi_id uuid;
BEGIN
  IF COALESCE(NEW.is_demo, false) THEN
    RETURN NEW;
  END IF;

  SELECT tl.id, tl.platform_account_id, pa.platform_id,
         tl.campanha_id, tl.conteudo_id, tl.utm_id, tl.landing_page_instance_id
    INTO _tl_id, _platform_account_id, _platform_id,
         _campanha_id, _conteudo_id, _utm_id, _lpi_id
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  WHERE COALESCE(tl.is_demo, false) = false
    AND (
      (NEW.tracking_link_id IS NOT NULL AND tl.id = NEW.tracking_link_id)
      OR (NEW.landing_page_instance_id IS NOT NULL AND tl.landing_page_instance_id = NEW.landing_page_instance_id)
      OR (
        NEW.tracking_link_id IS NULL
        AND NEW.landing_page_instance_id IS NULL
        AND tl.influencer_id = NEW.influencer_id
        AND (NEW.landing_page_id IS NULL OR tl.landing_page_id = NEW.landing_page_id OR tl.landing_page_id IS NULL)
      )
    )
  ORDER BY (tl.id = NEW.tracking_link_id) DESC NULLS LAST,
           (tl.landing_page_instance_id = NEW.landing_page_instance_id) DESC NULLS LAST,
           (tl.landing_page_id = NEW.landing_page_id) DESC NULLS LAST,
           COALESCE(tl.updated_at, tl.created_at) DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.tracking_events (
    canonical_event_name, raw_event_name, source_type,
    influencer_id, landing_page_id, landing_page_instance_id,
    tracking_link_id, platform_account_id, platform_id,
    campanha_id, conteudo_id, utm_id,
    click_id, event_timestamp, raw_payload, is_demo
  ) VALUES (
    'click', 'lp_click', 'landing_page',
    NEW.influencer_id, NEW.landing_page_id, COALESCE(NEW.landing_page_instance_id, _lpi_id),
    _tl_id, _platform_account_id, _platform_id,
    _campanha_id, _conteudo_id, _utm_id,
    COALESCE(NEW.click_id, NEW.id::text), COALESCE(NEW.clicked_at, now()),
    jsonb_build_object(
      'user_agent', NEW.user_agent,
      'referrer', NEW.referrer,
      'route', NEW.route,
      'source', NEW.source,
      'ip_address', NEW.ip_address,
      'tracking_link_id', NEW.tracking_link_id,
      'landing_page_instance_id', NEW.landing_page_instance_id
    ),
    false
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.playbet_sync_link_share_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lpi record;
  _lp record;
  _share text;
  _affiliate text;
BEGIN
  IF COALESCE(NEW.is_demo, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT * INTO _lpi FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
    SELECT * INTO _lp FROM public.landing_pages WHERE id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id);

    _share := public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
      'sub1',
      NEW.tracking_code,
      false
    );

    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(NEW.base_url, ''), NULLIF(_lpi.affiliate_link, ''), NULLIF(NEW.short_url, '')),
      NEW.click_id_param_name,
      NEW.tracking_code,
      NEW.influencer_id,
      NEW.campanha_id
    );

    UPDATE public.tracking_links
       SET final_url = COALESCE(_share, final_url),
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id),
           use_lp = true,
           lp_auto_generated = true
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_share, final_url)
            OR landing_page_id IS DISTINCT FROM COALESCE(NEW.landing_page_id, _lpi.landing_page_id)
            OR use_lp IS DISTINCT FROM true
            OR lp_auto_generated IS DISTINCT FROM true);

    UPDATE public.lp_opportunities
       SET destination_url = COALESCE(_affiliate, destination_url),
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id, landing_page_id),
           updated_at = now()
     WHERE tracking_link_id = NEW.id
       AND COALESCE((metadata->>'auto')::boolean, false) = true;
  ELSE
    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, '')),
      NEW.click_id_param_name,
      NEW.tracking_code,
      NEW.influencer_id,
      NEW.campanha_id
    );

    UPDATE public.tracking_links
       SET final_url = COALESCE(_affiliate, final_url),
           lp_auto_generated = false
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_affiliate, final_url)
            OR lp_auto_generated IS DISTINCT FROM false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_playbet_sync_link_share_url ON public.tracking_links;
CREATE TRIGGER zzz_playbet_sync_link_share_url
AFTER INSERT OR UPDATE OF base_url, short_url, click_id_param_name, tracking_code, influencer_id, campanha_id, landing_page_instance_id
ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.playbet_sync_link_share_url();

CREATE OR REPLACE FUNCTION public.sync_landing_page_instance_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tl record;
  _lp record;
  _share text;
  _affiliate text;
BEGIN
  SELECT id, domain, route INTO _lp
  FROM public.landing_pages
  WHERE id = NEW.landing_page_id;

  FOR _tl IN
    SELECT id, base_url, short_url, click_id_param_name, tracking_code, influencer_id, campanha_id
    FROM public.tracking_links
    WHERE landing_page_instance_id = NEW.id
      AND COALESCE(is_demo, false) = false
  LOOP
    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(_tl.base_url, ''), NULLIF(NEW.affiliate_link, ''), NULLIF(_tl.short_url, '')),
      _tl.click_id_param_name,
      _tl.tracking_code,
      _tl.influencer_id,
      _tl.campanha_id
    );

    _share := public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp.domain, _lp.route, NEW.slug, NEW.lp_mode, _tl.influencer_id, _tl.campanha_id),
      'sub1',
      _tl.tracking_code,
      false
    );

    UPDATE public.tracking_links
       SET final_url = COALESCE(_share, final_url),
           landing_page_id = NEW.landing_page_id,
           use_lp = true,
           lp_auto_generated = true
     WHERE id = _tl.id;

    UPDATE public.lp_opportunities
       SET destination_url = COALESCE(_affiliate, destination_url),
           landing_page_id = NEW.landing_page_id,
           updated_at = now()
     WHERE tracking_link_id = _tl.id
       AND COALESCE((metadata->>'auto')::boolean, false) = true;
  END LOOP;

  RETURN NEW;
END;
$$;

WITH computed AS (
  SELECT tl.id,
         public.playbet_append_url_param(
           public.playbet_public_lp_url(lp.domain, lp.route, lpi.slug, lpi.lp_mode, tl.influencer_id, tl.campanha_id),
           'sub1', tl.tracking_code, false
         ) AS share_url,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url, ''), NULLIF(lpi.affiliate_link, ''), NULLIF(tl.short_url, '')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url,
         COALESCE(tl.landing_page_id, lpi.landing_page_id) AS effective_landing_page_id
  FROM public.tracking_links tl
  LEFT JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  LEFT JOIN public.landing_pages lp ON lp.id = COALESCE(tl.landing_page_id, lpi.landing_page_id)
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.tracking_links tl
   SET final_url = COALESCE(CASE WHEN tl.landing_page_instance_id IS NOT NULL THEN computed.share_url ELSE computed.affiliate_url END, tl.final_url),
       landing_page_id = COALESCE(tl.landing_page_id, computed.effective_landing_page_id),
       use_lp = (tl.landing_page_instance_id IS NOT NULL),
       lp_auto_generated = (tl.landing_page_instance_id IS NOT NULL)
FROM computed
WHERE computed.id = tl.id;

WITH computed AS (
  SELECT tl.id,
         tl.landing_page_id,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url, ''), NULLIF(lpi.affiliate_link, ''), NULLIF(tl.short_url, '')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url
  FROM public.tracking_links tl
  LEFT JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.lp_opportunities opp
   SET destination_url = COALESCE(computed.affiliate_url, opp.destination_url),
       landing_page_id = COALESCE(opp.landing_page_id, computed.landing_page_id),
       updated_at = now()
FROM computed
WHERE computed.id = opp.tracking_link_id
  AND COALESCE((opp.metadata->>'auto')::boolean, false) = true;