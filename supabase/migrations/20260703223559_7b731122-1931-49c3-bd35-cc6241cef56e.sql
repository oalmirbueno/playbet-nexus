CREATE OR REPLACE FUNCTION public.playbet_sync_link_share_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lpi record;
  _lp record;
  _share text;
  _affiliate text;
  _param text;
BEGIN
  IF COALESCE(NEW.is_demo, false) THEN
    RETURN NEW;
  END IF;

  _param := COALESCE(NULLIF(NEW.click_id_param_name, ''), 'sub1');

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT * INTO _lpi FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
    SELECT * INTO _lp FROM public.landing_pages WHERE id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id);

    _share := public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
      _param,
      NEW.tracking_code,
      false
    );

    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(NEW.base_url, ''), NULLIF(_lpi.affiliate_link, ''), NULLIF(NEW.short_url, '')),
      _param,
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
      _param,
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
$function$;