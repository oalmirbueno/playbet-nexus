
-- =========================================================
-- 1) RESET: limpa qualquer atribuição que não seja estritamente justificável
-- =========================================================

-- Clicks: mantém apenas quando a instância do clique bate com a instância do link
UPDATE public.clicks c
SET tracking_link_id = NULL
WHERE tracking_link_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tracking_links tl
    WHERE tl.id = c.tracking_link_id
      AND tl.landing_page_instance_id IS NOT NULL
      AND tl.landing_page_instance_id = c.landing_page_instance_id
  );

-- Events: mantém apenas quando (a) sub1 = tracking_code, (b) instance bate com o link,
-- ou (c) o click_id vem de um clique já atribuído por prova de instância.
UPDATE public.tracking_events e
SET tracking_link_id = NULL
WHERE tracking_link_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tracking_links tl
    WHERE tl.id = e.tracking_link_id
      AND (
        (tl.tracking_code IS NOT NULL AND tl.tracking_code = (e.raw_payload->>'sub1'))
        OR (tl.landing_page_instance_id IS NOT NULL
            AND tl.landing_page_instance_id = e.landing_page_instance_id)
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.clicks c
    WHERE e.click_id IS NOT NULL
      AND c.click_id = e.click_id
      AND c.tracking_link_id = e.tracking_link_id
  );

-- Metrics: limpa landing_page_instance_id que foi atribuído por "link mais recente".
-- Só mantém quando o influencer + platform_account desta métrica tem exatamente 1 link
-- e esse link aponta para a mesma instância registrada.
UPDATE public.tracking_metrics m
SET landing_page_instance_id = NULL
WHERE landing_page_instance_id IS NOT NULL
  AND m.influencer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.tracking_links tl
    WHERE tl.influencer_id = m.influencer_id
      AND (tl.platform_account_id = m.platform_account_id OR m.platform_account_id IS NULL)
      AND tl.landing_page_instance_id = m.landing_page_instance_id
      AND (
        SELECT COUNT(DISTINCT tl2.landing_page_instance_id)
        FROM public.tracking_links tl2
        WHERE tl2.influencer_id = m.influencer_id
          AND (tl2.platform_account_id = m.platform_account_id OR m.platform_account_id IS NULL)
          AND tl2.landing_page_instance_id IS NOT NULL
      ) = 1
  );

-- =========================================================
-- 2) RE-ATRIBUIÇÃO ESTRITA (sem cair em "influencer único")
-- =========================================================

-- 2a) Clicks: só via landing_page_instance_id (e apenas se essa instância pertence a 1 único link)
UPDATE public.clicks c
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE c.tracking_link_id IS NULL
  AND c.landing_page_instance_id IS NOT NULL
  AND tl.landing_page_instance_id = c.landing_page_instance_id
  AND (
    SELECT COUNT(*) FROM public.tracking_links tl2
    WHERE tl2.landing_page_instance_id = c.landing_page_instance_id
  ) = 1;

-- 2b) Events: sub1 = tracking_code (prova direta)
UPDATE public.tracking_events e
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE e.tracking_link_id IS NULL
  AND tl.tracking_code IS NOT NULL
  AND (e.raw_payload->>'sub1') = tl.tracking_code;

-- 2c) Events: click_id encadeado a um clique já atribuído com prova
UPDATE public.tracking_events e
SET tracking_link_id = c.tracking_link_id
FROM public.clicks c
WHERE e.tracking_link_id IS NULL
  AND e.click_id IS NOT NULL
  AND c.click_id = e.click_id
  AND c.tracking_link_id IS NOT NULL;

-- 2d) Events: landing_page_instance_id quando essa instância pertence a 1 único link
UPDATE public.tracking_events e
SET tracking_link_id = tl.id
FROM public.tracking_links tl
WHERE e.tracking_link_id IS NULL
  AND e.landing_page_instance_id IS NOT NULL
  AND tl.landing_page_instance_id = e.landing_page_instance_id
  AND (
    SELECT COUNT(*) FROM public.tracking_links tl2
    WHERE tl2.landing_page_instance_id = e.landing_page_instance_id
  ) = 1;

-- 2e) Metrics: só quando influencer + platform_account tem 1 único link com instância
UPDATE public.tracking_metrics m
SET landing_page_instance_id = tl.landing_page_instance_id
FROM public.tracking_links tl
WHERE m.landing_page_instance_id IS NULL
  AND m.influencer_id IS NOT NULL
  AND tl.influencer_id = m.influencer_id
  AND (tl.platform_account_id = m.platform_account_id OR m.platform_account_id IS NULL)
  AND tl.landing_page_instance_id IS NOT NULL
  AND (
    SELECT COUNT(DISTINCT tl2.landing_page_instance_id)
    FROM public.tracking_links tl2
    WHERE tl2.influencer_id = m.influencer_id
      AND (tl2.platform_account_id = m.platform_account_id OR m.platform_account_id IS NULL)
      AND tl2.landing_page_instance_id IS NOT NULL
  ) = 1;

-- =========================================================
-- 3) TRIGGERS ESTRITOS: nunca mais cair em "qualquer link do influencer"
-- =========================================================
CREATE OR REPLACE FUNCTION public.fill_click_tracking_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_link uuid;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  -- Só atribui se a instância pertence a exatamente 1 link.
  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT COUNT(*), MIN(id)
      INTO v_count, v_link
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fill_event_tracking_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub1 text;
  v_count int;
  v_link uuid;
BEGIN
  IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;

  -- (a) prova direta: sub1 == tracking_code
  v_sub1 := NEW.raw_payload->>'sub1';
  IF v_sub1 IS NOT NULL AND v_sub1 <> '' THEN
    SELECT id INTO NEW.tracking_link_id
      FROM public.tracking_links
     WHERE tracking_code = v_sub1
     LIMIT 1;
    IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;
  END IF;

  -- (b) click_id já atribuído com prova
  IF NEW.click_id IS NOT NULL THEN
    SELECT tracking_link_id INTO NEW.tracking_link_id
      FROM public.clicks
     WHERE click_id = NEW.click_id
       AND tracking_link_id IS NOT NULL
     LIMIT 1;
    IF NEW.tracking_link_id IS NOT NULL THEN RETURN NEW; END IF;
  END IF;

  -- (c) instância que pertence a exatamente 1 link
  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT COUNT(*), MIN(id)
      INTO v_count, v_link
      FROM public.tracking_links
     WHERE landing_page_instance_id = NEW.landing_page_instance_id;
    IF v_count = 1 THEN
      NEW.tracking_link_id := v_link;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recria os triggers (as funções foram substituídas via CREATE OR REPLACE, mas garantir binding)
DROP TRIGGER IF EXISTS trg_clicks_fill_tracking_link ON public.clicks;
CREATE TRIGGER trg_clicks_fill_tracking_link
BEFORE INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.fill_click_tracking_link();

DROP TRIGGER IF EXISTS trg_events_fill_tracking_link ON public.tracking_events;
CREATE TRIGGER trg_events_fill_tracking_link
BEFORE INSERT ON public.tracking_events
FOR EACH ROW EXECUTE FUNCTION public.fill_event_tracking_link();
