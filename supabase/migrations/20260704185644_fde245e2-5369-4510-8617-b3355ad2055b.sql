CREATE OR REPLACE FUNCTION public.enforce_tracking_link_exact_lp_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _lpi record;
  _lp record;
  _share text;
BEGIN
  IF COALESCE(NEW.is_demo, false) OR NEW.landing_page_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, slug, lp_mode, landing_page_id
    INTO _lpi
  FROM public.landing_page_instances
  WHERE id = NEW.landing_page_instance_id
  LIMIT 1;

  IF _lpi.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT domain, route
    INTO _lp
  FROM public.landing_pages
  WHERE id = _lpi.landing_page_id
  LIMIT 1;

  _share := public.playbet_append_url_param(
    public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
      COALESCE(NULLIF(NEW.click_id_param_name, ''), 'sub1'),
      NEW.tracking_code,
      false
    ),
    'lpi',
    NEW.landing_page_instance_id::text,
    true
  );

  IF _share IS NOT NULL THEN
    UPDATE public.tracking_links
       SET final_url = _share,
           use_lp = true,
           lp_auto_generated = true,
           updated_at = now()
     WHERE id = NEW.id
       AND final_url IS DISTINCT FROM _share;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_enforce_tracking_link_exact_lp_url ON public.tracking_links;
CREATE TRIGGER zzz_enforce_tracking_link_exact_lp_url
AFTER INSERT OR UPDATE OF landing_page_instance_id, influencer_id, campanha_id, tracking_code, click_id_param_name
ON public.tracking_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tracking_link_exact_lp_url();