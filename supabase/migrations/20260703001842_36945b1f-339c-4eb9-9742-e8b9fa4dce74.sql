UPDATE public.tracking_events
SET status = 'invalid_internal_preview',
    is_duplicate = true,
    processed_at = COALESCE(processed_at, now()),
    updated_at = now()
WHERE canonical_event_name = 'lp_view'
  AND COALESCE(is_demo, false) = false
  AND status IS DISTINCT FROM 'invalid_internal_preview'
  AND (
    raw_payload->>'hostname' IN ('localhost', '127.0.0.1')
    OR raw_payload->>'hostname' LIKE 'id-preview--%lovable.app'
    OR raw_payload->>'referrer' ILIKE '%/lp-opportunities%'
    OR raw_payload->>'referrer' ILIKE '%/lp-instancias%'
    OR raw_payload->>'referrer' ILIKE '%/landing-pages%'
    OR raw_payload->>'referrer' ILIKE '%__lovable_%'
  );

UPDATE public.tracking_events
SET status = 'invalid_legacy',
    is_duplicate = true,
    processed_at = COALESCE(processed_at, now()),
    updated_at = now()
WHERE canonical_event_name = 'click'
  AND raw_event_name = 'click'
  AND COALESCE(is_demo, false) = false
  AND click_id IS NULL
  AND tracking_link_id IS NULL
  AND landing_page_instance_id IS NULL
  AND status IS DISTINCT FROM 'invalid_legacy';

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY canonical_event_name, click_id, tracking_link_id, landing_page_instance_id
           ORDER BY event_timestamp ASC, created_at ASC, id ASC
         ) AS rn
  FROM public.tracking_events
  WHERE COALESCE(is_demo, false) = false
    AND COALESCE(is_duplicate, false) = false
    AND source_type = 'landing_page'
    AND canonical_event_name IN ('lp_view', 'click')
    AND click_id IS NOT NULL
)
UPDATE public.tracking_events te
SET status = 'duplicate_technical',
    is_duplicate = true,
    processed_at = COALESCE(te.processed_at, now()),
    updated_at = now()
FROM ranked r
WHERE te.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tracking_events_lp_view_per_click
  ON public.tracking_events (click_id, COALESCE(landing_page_instance_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE canonical_event_name = 'lp_view'
    AND source_type = 'landing_page'
    AND click_id IS NOT NULL
    AND COALESCE(is_demo, false) = false
    AND COALESCE(is_duplicate, false) = false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tracking_events_lp_click_per_click
  ON public.tracking_events (click_id, COALESCE(tracking_link_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(landing_page_instance_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE canonical_event_name = 'click'
    AND source_type = 'landing_page'
    AND click_id IS NOT NULL
    AND COALESCE(is_demo, false) = false
    AND COALESCE(is_duplicate, false) = false;

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
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;