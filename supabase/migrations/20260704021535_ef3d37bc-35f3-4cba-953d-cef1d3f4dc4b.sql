
-- 1a) clicks por landing_page_instance_id
UPDATE public.clicks c
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE c.tracking_link_id IS NULL
  AND c.landing_page_instance_id IS NOT NULL
  AND tl.landing_page_instance_id = c.landing_page_instance_id;

-- 1b) clicks por influencer_id quando único
UPDATE public.clicks c
SET tracking_link_id = sub.tl_id
FROM (
  SELECT c2.id AS click_id, (array_agg(tl.id))[1] AS tl_id
  FROM public.clicks c2
  JOIN public.tracking_links tl
    ON tl.influencer_id = c2.influencer_id
   AND (tl.landing_page_id = c2.landing_page_id OR c2.landing_page_id IS NULL)
  WHERE c2.tracking_link_id IS NULL
    AND c2.influencer_id IS NOT NULL
  GROUP BY c2.id
  HAVING COUNT(DISTINCT tl.id) = 1
) sub
WHERE c.id = sub.click_id;

-- 2a) events por sub1 = tracking_code
UPDATE public.tracking_events e
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE e.tracking_link_id IS NULL
  AND tl.tracking_code IS NOT NULL
  AND (e.raw_payload->>'sub1') = tl.tracking_code;

-- 2b) events por click_id em clicks
UPDATE public.tracking_events e
SET tracking_link_id = c.tracking_link_id
FROM public.clicks c
WHERE e.tracking_link_id IS NULL
  AND e.click_id IS NOT NULL
  AND c.click_id = e.click_id
  AND c.tracking_link_id IS NOT NULL;

-- 2c) events por landing_page_instance_id
UPDATE public.tracking_events e
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE e.tracking_link_id IS NULL
  AND e.landing_page_instance_id IS NOT NULL
  AND tl.landing_page_instance_id = e.landing_page_instance_id;

-- 2d) events por influencer_id quando único
UPDATE public.tracking_events e
SET tracking_link_id = sub.tl_id
FROM (
  SELECT ev.id AS ev_id, (array_agg(tl.id))[1] AS tl_id
  FROM public.tracking_events ev
  JOIN public.tracking_links tl ON tl.influencer_id = ev.influencer_id
  WHERE ev.tracking_link_id IS NULL
    AND ev.influencer_id IS NOT NULL
  GROUP BY ev.id
  HAVING COUNT(DISTINCT tl.id) = 1
) sub
WHERE e.id = sub.ev_id;

-- 3) metrics: landing_page_instance_id
UPDATE public.tracking_metrics m
SET landing_page_instance_id = sub.inst_id
FROM (
  SELECT m2.id AS metric_id, (array_agg(DISTINCT tl.landing_page_instance_id))[1] AS inst_id
  FROM public.tracking_metrics m2
  JOIN public.tracking_links tl
    ON tl.influencer_id = m2.influencer_id
   AND (tl.platform_account_id = m2.platform_account_id OR m2.platform_account_id IS NULL)
  WHERE m2.landing_page_instance_id IS NULL
    AND m2.influencer_id IS NOT NULL
    AND tl.landing_page_instance_id IS NOT NULL
  GROUP BY m2.id
  HAVING COUNT(DISTINCT tl.landing_page_instance_id) = 1
) sub
WHERE m.id = sub.metric_id;

-- 4) trigger on clicks
CREATE OR REPLACE FUNCTION public.fill_click_tracking_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT id INTO NEW.tracking_link_id
    FROM public.tracking_links
    WHERE landing_page_instance_id = NEW.landing_page_instance_id
    LIMIT 1;
  END IF;

  IF NEW.tracking_link_id IS NULL AND NEW.influencer_id IS NOT NULL THEN
    SELECT id INTO NEW.tracking_link_id
    FROM public.tracking_links
    WHERE influencer_id = NEW.influencer_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clicks_fill_tracking_link ON public.clicks;
CREATE TRIGGER trg_clicks_fill_tracking_link
BEFORE INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.fill_click_tracking_link();

-- 5) trigger on tracking_events
CREATE OR REPLACE FUNCTION public.fill_event_tracking_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub1 text;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  v_sub1 := NEW.raw_payload->>'sub1';
  IF v_sub1 IS NOT NULL THEN
    SELECT id INTO NEW.tracking_link_id
    FROM public.tracking_links
    WHERE tracking_code = v_sub1
    LIMIT 1;
  END IF;

  IF NEW.tracking_link_id IS NULL AND NEW.click_id IS NOT NULL THEN
    SELECT tracking_link_id INTO NEW.tracking_link_id
    FROM public.clicks
    WHERE click_id = NEW.click_id
      AND tracking_link_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF NEW.tracking_link_id IS NULL AND NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT id INTO NEW.tracking_link_id
    FROM public.tracking_links
    WHERE landing_page_instance_id = NEW.landing_page_instance_id
    LIMIT 1;
  END IF;

  IF NEW.tracking_link_id IS NULL AND NEW.influencer_id IS NOT NULL THEN
    SELECT id INTO NEW.tracking_link_id
    FROM public.tracking_links
    WHERE influencer_id = NEW.influencer_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_fill_tracking_link ON public.tracking_events;
CREATE TRIGGER trg_events_fill_tracking_link
BEFORE INSERT ON public.tracking_events
FOR EACH ROW EXECUTE FUNCTION public.fill_event_tracking_link();
