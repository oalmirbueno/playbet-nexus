CREATE OR REPLACE FUNCTION public.fill_click_tracking_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_link uuid;
  v_ref text;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT COUNT(*), MIN(id)
      INTO v_count, v_link
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id
       AND COALESCE(is_demo, false) = false;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
      RETURN NEW;
    END IF;
  END IF;

  v_ref := NULLIF(substring(COALESCE(NEW.route, '') from '(?:^|[?&])ref=([^&]+)'), '');
  IF v_ref IS NOT NULL THEN
    SELECT COUNT(*), MIN(tl.id)
      INTO v_count, v_link
      FROM public.tracking_links tl
      JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
     WHERE lpi.slug = v_ref
       AND COALESCE(tl.is_demo, false) = false;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fill_event_tracking_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT COUNT(*), MIN(id)
      INTO v_count, v_link
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id
       AND COALESCE(is_demo, false) = false;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
      RETURN NEW;
    END IF;
  END IF;

  v_ref := COALESCE(
    NULLIF(substring(COALESCE(NEW.raw_payload->>'route', '') from '(?:^|[?&])ref=([^&]+)'), ''),
    NULLIF(substring(COALESCE(NEW.raw_payload->>'search', '') from '(?:^|[?&])ref=([^&]+)'), '')
  );
  IF v_ref IS NOT NULL THEN
    SELECT COUNT(*), MIN(tl.id)
      INTO v_count, v_link
      FROM public.tracking_links tl
      JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
     WHERE lpi.slug = v_ref
       AND COALESCE(tl.is_demo, false) = false;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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
  IF COALESCE(NEW.is_demo, false) THEN RETURN NEW; END IF;

  SELECT tl.id, tl.platform_account_id, pa.platform_id, tl.campanha_id, tl.conteudo_id, tl.utm_id, tl.landing_page_instance_id
    INTO _tl_id, _platform_account_id, _platform_id, _campanha_id, _conteudo_id, _utm_id, _lpi_id
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  LEFT JOIN public.landing_page_instances lpi ON lpi.id = NEW.landing_page_instance_id
  WHERE COALESCE(tl.is_demo, false) = false
    AND (
      (NEW.tracking_link_id IS NOT NULL AND tl.id = NEW.tracking_link_id)
      OR (NEW.tracking_link_id IS NULL AND lpi.source_tracking_link_id IS NOT NULL AND tl.id = lpi.source_tracking_link_id)
      OR (NEW.tracking_link_id IS NULL AND NEW.landing_page_instance_id IS NOT NULL AND tl.landing_page_instance_id = NEW.landing_page_instance_id)
    )
  ORDER BY (tl.id = NEW.tracking_link_id) DESC NULLS LAST,
           (tl.id = lpi.source_tracking_link_id) DESC NULLS LAST,
           (tl.landing_page_instance_id = NEW.landing_page_instance_id) DESC NULLS LAST,
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
    jsonb_build_object('user_agent', NEW.user_agent, 'referrer', NEW.referrer, 'route', NEW.route, 'source', NEW.source, 'ip_address', NEW.ip_address, 'tracking_link_id', NEW.tracking_link_id, 'landing_page_instance_id', NEW.landing_page_instance_id),
    false
  );
  RETURN NEW;
END;
$$;