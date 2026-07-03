CREATE OR REPLACE FUNCTION public.sync_public_lp_share_url_sub1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lpi record;
  _lp record;
  _share text;
BEGIN
  IF COALESCE(NEW.is_demo, false) OR NEW.landing_page_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _lpi
  FROM public.landing_page_instances
  WHERE id = NEW.landing_page_instance_id;

  IF _lpi.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _lp
  FROM public.landing_pages
  WHERE id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id);

  _share := public.playbet_append_url_param(
    public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
    'sub1',
    NEW.tracking_code,
    false
  );

  IF _share IS NOT NULL THEN
    UPDATE public.tracking_links
       SET final_url = _share,
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id),
           use_lp = true,
           lp_auto_generated = true,
           updated_at = now()
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM _share
            OR landing_page_id IS DISTINCT FROM COALESCE(NEW.landing_page_id, _lpi.landing_page_id)
            OR use_lp IS DISTINCT FROM true
            OR lp_auto_generated IS DISTINCT FROM true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_lp_share_url_sub1 ON public.tracking_links;
CREATE TRIGGER trg_sync_public_lp_share_url_sub1
AFTER INSERT OR UPDATE OF landing_page_instance_id, landing_page_id, influencer_id, campanha_id, tracking_code
ON public.tracking_links
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_lp_share_url_sub1();

REVOKE EXECUTE ON FUNCTION public.sync_public_lp_share_url_sub1() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_lp_share_url_sub1() TO service_role;