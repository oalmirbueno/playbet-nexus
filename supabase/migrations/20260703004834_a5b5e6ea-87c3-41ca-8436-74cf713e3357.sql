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
  _lp_id uuid;
  _click_id text;
  _effective_lpi_id uuid;
  _effective_lp_id uuid;
BEGIN
  IF COALESCE(NEW.is_demo, false) THEN
    RETURN NEW;
  END IF;

  SELECT tl.id, tl.platform_account_id, pa.platform_id,
         tl.campanha_id, tl.conteudo_id, tl.utm_id,
         tl.landing_page_instance_id, tl.landing_page_id
    INTO _tl_id, _platform_account_id, _platform_id,
         _campanha_id, _conteudo_id, _utm_id, _lpi_id, _lp_id
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

  _click_id := COALESCE(NULLIF(NEW.click_id, ''), NEW.id::text);
  _effective_lpi_id := COALESCE(NEW.landing_page_instance_id, _lpi_id);
  _effective_lp_id := COALESCE(NEW.landing_page_id, _lp_id);

  IF NEW.source IN ('lp_instance', 'cta_click')
     OR NEW.route ILIKE '%ref=%'
     OR _effective_lpi_id IS NOT NULL
     OR _effective_lp_id IS NOT NULL THEN
    INSERT INTO public.tracking_events (
      canonical_event_name, raw_event_name, source_type,
      influencer_id, landing_page_id, landing_page_instance_id,
      tracking_link_id, platform_account_id, platform_id,
      campanha_id, conteudo_id, utm_id,
      click_id, event_timestamp, raw_payload, is_demo
    ) VALUES (
      'lp_view', 'lp_view_inferred', 'landing_page',
      NEW.influencer_id, _effective_lp_id, _effective_lpi_id,
      _tl_id, _platform_account_id, _platform_id,
      _campanha_id, _conteudo_id, _utm_id,
      _click_id, COALESCE(NEW.clicked_at, now()) - interval '1 second',
      jsonb_build_object(
        'inferred_from_click', true,
        'click_row_id', NEW.id,
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
  END IF;

  INSERT INTO public.tracking_events (
    canonical_event_name, raw_event_name, source_type,
    influencer_id, landing_page_id, landing_page_instance_id,
    tracking_link_id, platform_account_id, platform_id,
    campanha_id, conteudo_id, utm_id,
    click_id, event_timestamp, raw_payload, is_demo
  ) VALUES (
    'click', 'lp_click', 'landing_page',
    NEW.influencer_id, _effective_lp_id, _effective_lpi_id,
    _tl_id, _platform_account_id, _platform_id,
    _campanha_id, _conteudo_id, _utm_id,
    _click_id, COALESCE(NEW.clicked_at, now()),
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

WITH resolved_clicks AS (
  SELECT
    c.*,
    COALESCE(NULLIF(c.click_id, ''), c.id::text) AS resolved_click_id,
    tl.id AS resolved_tracking_link_id,
    tl.platform_account_id AS resolved_platform_account_id,
    pa.platform_id AS resolved_platform_id,
    tl.campanha_id AS resolved_campanha_id,
    tl.conteudo_id AS resolved_conteudo_id,
    tl.utm_id AS resolved_utm_id,
    tl.landing_page_instance_id AS resolved_lpi_id,
    tl.landing_page_id AS resolved_lp_id
  FROM public.clicks c
  LEFT JOIN LATERAL (
    SELECT tl.*
    FROM public.tracking_links tl
    WHERE COALESCE(tl.is_demo, false) = false
      AND (
        (c.tracking_link_id IS NOT NULL AND tl.id = c.tracking_link_id)
        OR (c.landing_page_instance_id IS NOT NULL AND tl.landing_page_instance_id = c.landing_page_instance_id)
        OR (
          c.tracking_link_id IS NULL
          AND c.landing_page_instance_id IS NULL
          AND tl.influencer_id = c.influencer_id
          AND (c.landing_page_id IS NULL OR tl.landing_page_id = c.landing_page_id OR tl.landing_page_id IS NULL)
        )
      )
    ORDER BY (tl.id = c.tracking_link_id) DESC NULLS LAST,
             (tl.landing_page_instance_id = c.landing_page_instance_id) DESC NULLS LAST,
             (tl.landing_page_id = c.landing_page_id) DESC NULLS LAST,
             COALESCE(tl.updated_at, tl.created_at) DESC NULLS LAST
    LIMIT 1
  ) tl ON true
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  WHERE COALESCE(c.is_demo, false) = false
    AND (
      c.source IN ('lp_instance', 'cta_click')
      OR c.route ILIKE '%ref=%'
      OR c.landing_page_instance_id IS NOT NULL
      OR c.landing_page_id IS NOT NULL
      OR tl.landing_page_instance_id IS NOT NULL
      OR tl.landing_page_id IS NOT NULL
    )
    AND NOT (
      COALESCE(c.route, '') ILIKE '%_preview%'
      OR COALESCE(c.referrer, '') ILIKE '%_preview%'
      OR COALESCE(c.referrer, '') ILIKE '%id-preview--%lovable.app%'
      OR COALESCE(c.referrer, '') ILIKE '%/lp-opportunities%'
      OR COALESCE(c.referrer, '') ILIKE '%/lp-instancias%'
      OR COALESCE(c.referrer, '') ILIKE '%/landing-pages%'
      OR COALESCE(c.referrer, '') ILIKE '%__lovable_%'
    )
)
INSERT INTO public.tracking_events (
  canonical_event_name, raw_event_name, source_type,
  influencer_id, landing_page_id, landing_page_instance_id,
  tracking_link_id, platform_account_id, platform_id,
  campanha_id, conteudo_id, utm_id,
  click_id, event_timestamp, raw_payload, is_demo
)
SELECT
  'lp_view', 'lp_view_inferred', 'landing_page',
  influencer_id, COALESCE(landing_page_id, resolved_lp_id), COALESCE(landing_page_instance_id, resolved_lpi_id),
  resolved_tracking_link_id, resolved_platform_account_id, resolved_platform_id,
  resolved_campanha_id, resolved_conteudo_id, resolved_utm_id,
  resolved_click_id, COALESCE(clicked_at, now()) - interval '1 second',
  jsonb_build_object(
    'inferred_from_click', true,
    'backfilled', true,
    'click_row_id', id,
    'user_agent', user_agent,
    'referrer', referrer,
    'route', route,
    'source', source,
    'ip_address', ip_address,
    'tracking_link_id', tracking_link_id,
    'landing_page_instance_id', landing_page_instance_id
  ),
  false
FROM resolved_clicks
ON CONFLICT DO NOTHING;