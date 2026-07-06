
CREATE OR REPLACE FUNCTION public.fill_click_tracking_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_link uuid;
  v_ref text;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id
       AND COALESCE(is_demo, false) = false;
    IF v_count = 1 THEN
      SELECT id INTO v_link
        FROM public.tracking_links
       WHERE landing_page_instance_id = NEW.landing_page_instance_id
         AND COALESCE(is_demo, false) = false
       ORDER BY created_at ASC
       LIMIT 1;
      NEW.tracking_link_id := v_link;
      RETURN NEW;
    END IF;
  END IF;

  v_ref := NULLIF(substring(COALESCE(NEW.route, '') from '(?:^|[?&])ref=([^&]+)'), '');
  IF v_ref IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
      FROM public.tracking_links tl
      JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
     WHERE lpi.slug = v_ref
       AND COALESCE(tl.is_demo, false) = false;
    IF v_count = 1 THEN
      SELECT tl.id INTO v_link
        FROM public.tracking_links tl
        JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
       WHERE lpi.slug = v_ref
         AND COALESCE(tl.is_demo, false) = false
       ORDER BY tl.created_at ASC
       LIMIT 1;
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fill_event_tracking_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub1 text;
  v_ref text;
  v_count int;
  v_link uuid;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  v_sub1 := COALESCE(NULLIF(NEW.raw_payload->>'sub1', ''), NULLIF(NEW.raw_payload->>'afp', ''), NULLIF(NEW.raw_payload->>'tracking_code', ''));
  IF v_sub1 IS NOT NULL AND v_sub1 <> '' THEN
    SELECT id INTO NEW.tracking_link_id
      FROM public.tracking_links
     WHERE tracking_code = v_sub1
       AND COALESCE(is_demo, false) = false
     LIMIT 1;
    IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;
  END IF;

  IF NEW.click_id IS NOT NULL THEN
    SELECT tracking_link_id INTO NEW.tracking_link_id
      FROM public.clicks
     WHERE click_id = NEW.click_id
       AND tracking_link_id IS NOT NULL
     LIMIT 1;
    IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;
  END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id
       AND COALESCE(is_demo, false) = false;
    IF v_count = 1 THEN
      SELECT id INTO v_link
        FROM public.tracking_links
       WHERE landing_page_instance_id = NEW.landing_page_instance_id
         AND COALESCE(is_demo, false) = false
       ORDER BY created_at ASC
       LIMIT 1;
      NEW.tracking_link_id := v_link;
      RETURN NEW;
    END IF;
  END IF;

  v_ref := COALESCE(
    NULLIF(substring(COALESCE(NEW.raw_payload->>'route', '') from '(?:^|[?&])ref=([^&]+)'), ''),
    NULLIF(substring(COALESCE(NEW.raw_payload->>'search', '') from '(?:^|[?&])ref=([^&]+)'), '')
  );
  IF v_ref IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
      FROM public.tracking_links tl
      JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
     WHERE lpi.slug = v_ref
       AND COALESCE(tl.is_demo, false) = false;
    IF v_count = 1 THEN
      SELECT tl.id INTO v_link
        FROM public.tracking_links tl
        JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
       WHERE lpi.slug = v_ref
         AND COALESCE(tl.is_demo, false) = false
       ORDER BY tl.created_at ASC
       LIMIT 1;
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
