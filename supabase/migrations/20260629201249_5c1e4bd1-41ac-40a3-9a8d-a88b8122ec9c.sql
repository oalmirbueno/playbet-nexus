
-- 1) Function: sincroniza cliques (LP) -> tracking_events
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
  IF NEW.is_demo THEN
    RETURN NEW;
  END IF;

  -- Resolve tracking_link mais recente p/ esse influencer (+ LP se informada)
  SELECT tl.id, tl.platform_account_id, pa.platform_id,
         tl.campanha_id, tl.conteudo_id, tl.utm_id, tl.landing_page_instance_id
    INTO _tl_id, _platform_account_id, _platform_id,
         _campanha_id, _conteudo_id, _utm_id, _lpi_id
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  WHERE tl.influencer_id = NEW.influencer_id
    AND tl.is_demo = false
    AND (NEW.landing_page_id IS NULL OR tl.landing_page_id = NEW.landing_page_id OR tl.landing_page_id IS NULL)
  ORDER BY (tl.landing_page_id = NEW.landing_page_id) DESC NULLS LAST,
           tl.created_at DESC
  LIMIT 1;

  INSERT INTO public.tracking_events (
    canonical_event_name, raw_event_name, source_type,
    influencer_id, landing_page_id, landing_page_instance_id,
    tracking_link_id, platform_account_id, platform_id,
    campanha_id, conteudo_id, utm_id,
    click_id, event_timestamp, raw_payload, is_demo
  ) VALUES (
    'click', 'lp_click', 'landing_page',
    NEW.influencer_id, NEW.landing_page_id, _lpi_id,
    _tl_id, _platform_account_id, _platform_id,
    _campanha_id, _conteudo_id, _utm_id,
    NEW.id::text, COALESCE(NEW.clicked_at, now()),
    jsonb_build_object(
      'user_agent', NEW.user_agent,
      'referrer',   NEW.referrer,
      'route',      NEW.route,
      'source',     NEW.source,
      'ip_address', NEW.ip_address
    ),
    false
  );

  RETURN NEW;
END;
$$;

-- 2) Trigger
DROP TRIGGER IF EXISTS trg_clicks_to_tracking_events ON public.clicks;
CREATE TRIGGER trg_clicks_to_tracking_events
AFTER INSERT ON public.clicks
FOR EACH ROW
EXECUTE FUNCTION public.sync_click_to_tracking_event();

-- 3) Backfill cliques históricos (evita duplicar quem já existe via click_id = clicks.id)
INSERT INTO public.tracking_events (
  canonical_event_name, raw_event_name, source_type,
  influencer_id, landing_page_id, landing_page_instance_id,
  tracking_link_id, platform_account_id, platform_id,
  campanha_id, conteudo_id, utm_id,
  click_id, event_timestamp, raw_payload, is_demo
)
SELECT
  'click', 'lp_click', 'landing_page',
  c.influencer_id, c.landing_page_id, tl.landing_page_instance_id,
  tl.id, tl.platform_account_id, pa.platform_id,
  tl.campanha_id, tl.conteudo_id, tl.utm_id,
  c.id::text, COALESCE(c.clicked_at, now()),
  jsonb_build_object(
    'user_agent', c.user_agent,
    'referrer',   c.referrer,
    'route',      c.route,
    'source',     c.source,
    'ip_address', c.ip_address,
    'backfill',   true
  ),
  false
FROM public.clicks c
LEFT JOIN LATERAL (
  SELECT tl.id, tl.platform_account_id, tl.campanha_id, tl.conteudo_id,
         tl.utm_id, tl.landing_page_instance_id, tl.landing_page_id
  FROM public.tracking_links tl
  WHERE tl.influencer_id = c.influencer_id
    AND tl.is_demo = false
    AND (c.landing_page_id IS NULL OR tl.landing_page_id = c.landing_page_id OR tl.landing_page_id IS NULL)
  ORDER BY (tl.landing_page_id = c.landing_page_id) DESC NULLS LAST,
           tl.created_at DESC
  LIMIT 1
) tl ON TRUE
LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
WHERE c.is_demo = false
  AND NOT EXISTS (
    SELECT 1 FROM public.tracking_events te
    WHERE te.click_id = c.id::text
      AND te.canonical_event_name = 'click'
  );
