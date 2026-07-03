
-- Break recursive trigger loop between landing_page_instances <-> tracking_links.
-- Both trigger functions cross-update the other table, causing "stack depth limit exceeded"
-- when the LP editor saves. Guard both with pg_trigger_depth() so cross-updates fire only
-- at the top level, letting the second one no-op instead of recursing.

CREATE OR REPLACE FUNCTION public.sync_landing_page_instance_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tl record;
  _lp record;
  _share text;
  _affiliate text;
BEGIN
  -- Prevent recursion: if we're already inside a trigger chain, bail out.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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
$function$;
