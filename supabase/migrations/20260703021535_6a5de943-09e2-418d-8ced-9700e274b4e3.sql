-- Separação definitiva Estrela Bet x VUPI/Vipi por domínio, link e conta.

-- 1) Corrige catálogos de domínio para não haver domínio da Estrela Bet dentro da VUPI.
UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domains, '{}'::text[])) AS d
      WHERE lower(d) NOT IN ('estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro')
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domain_patterns, '{}'::text[])) AS d
      WHERE lower(d) NOT IN ('estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro')
    )
WHERE lower(coalesce(name,'')) LIKE '%vupi%'
   OR lower(coalesce(name,'')) LIKE '%vipi%'
   OR lower(coalesce(slug,'')) LIKE '%vupi%'
   OR lower(coalesce(slug,'')) LIKE '%vipi%';

UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domains, '{}'::text[]) || ARRAY['vupi.bet.br','vupi.com.br','go.aff.vupipartners.com','vupipartners.com','partners.vupi.com.br','go.vupi.com.br']) AS d
      WHERE d IS NOT NULL AND d <> ''
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domain_patterns, '{}'::text[]) || ARRAY['vupi.bet.br','vupi.com.br','go.aff.vupipartners.com','vupipartners.com','partners.vupi.com.br','go.vupi.com.br']) AS d
      WHERE d IS NOT NULL AND d <> ''
    )
WHERE lower(coalesce(name,'')) LIKE '%vupi%'
   OR lower(coalesce(name,'')) LIKE '%vipi%'
   OR lower(coalesce(slug,'')) LIKE '%vupi%'
   OR lower(coalesce(slug,'')) LIKE '%vipi%';

UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domains, '{}'::text[]) || ARRAY['estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro']) AS d
      WHERE d IS NOT NULL AND d <> ''
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d
      FROM unnest(coalesce(domain_patterns, '{}'::text[]) || ARRAY['estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro']) AS d
      WHERE d IS NOT NULL AND d <> ''
    )
WHERE lower(coalesce(name,'')) LIKE '%estrela%'
   OR lower(coalesce(slug,'')) LIKE '%estrela%';

-- 2) Resolver robusto por host exato/subdomínio, usando domains + domain_patterns. O domínio mais específico vence.
CREATE OR REPLACE FUNCTION public.resolve_platform_account_from_url(_url text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host text;
  best_platform uuid;
  acc uuid;
BEGIN
  IF _url IS NULL OR btrim(_url) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    host := lower(
      regexp_replace(
        regexp_replace(
          split_part(
            split_part(
              CASE WHEN _url ~* '^[a-z][a-z0-9+.-]*://' THEN _url ELSE 'https://' || _url END,
              '://', 2
            ), '/', 1
          ),
          '^www\.', ''
        ),
        ':\d+$', ''
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF host IS NULL OR host = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO best_platform
  FROM public.platforms p
  CROSS JOIN LATERAL unnest(
    coalesce(p.domains, '{}'::text[]) || coalesce(p.domain_patterns, '{}'::text[])
  ) AS d
  WHERE d IS NOT NULL
    AND btrim(d) <> ''
    AND (host = lower(btrim(d)) OR host LIKE '%.' || lower(btrim(d)))
  ORDER BY length(btrim(d)) DESC, p.created_at ASC NULLS LAST
  LIMIT 1;

  IF best_platform IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pa.id INTO acc
  FROM public.platform_accounts pa
  WHERE pa.platform_id = best_platform
    AND coalesce(pa.is_active, true) = true
    AND coalesce(pa.is_demo, false) = false
  ORDER BY pa.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN acc;
END;
$$;

-- 3) Garante que tracking_links sempre fiquem na casa do domínio real do link afiliado.
CREATE OR REPLACE FUNCTION public.enforce_tracking_link_platform_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_acc uuid;
  chosen_platform uuid;
  resolved_platform uuid;
BEGIN
  IF NEW.base_url IS NULL OR btrim(NEW.base_url) = '' THEN
    RETURN NEW;
  END IF;

  resolved_acc := public.resolve_platform_account_from_url(NEW.base_url);
  IF resolved_acc IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT platform_id INTO resolved_platform FROM public.platform_accounts WHERE id = resolved_acc;
  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT platform_id INTO chosen_platform FROM public.platform_accounts WHERE id = NEW.platform_account_id;
    IF chosen_platform IS NOT NULL AND chosen_platform = resolved_platform THEN
      RETURN NEW;
    END IF;
  END IF;

  NEW.platform_account_id := resolved_acc;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tracking_link_platform_match ON public.tracking_links;
CREATE TRIGGER trg_enforce_tracking_link_platform_match
BEFORE INSERT OR UPDATE OF base_url, platform_account_id ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.enforce_tracking_link_platform_match();

-- 4) Reclassifica links já existentes pela URL real da casa.
WITH resolved AS (
  SELECT
    tl.id AS link_id,
    public.resolve_platform_account_from_url(tl.base_url) AS new_account_id
  FROM public.tracking_links tl
  WHERE coalesce(tl.is_demo, false) = false
    AND tl.base_url IS NOT NULL
    AND btrim(tl.base_url) <> ''
)
UPDATE public.tracking_links tl
SET platform_account_id = r.new_account_id,
    updated_at = now()
FROM resolved r
WHERE tl.id = r.link_id
  AND r.new_account_id IS NOT NULL
  AND tl.platform_account_id IS DISTINCT FROM r.new_account_id;

-- 5) Reclassifica eventos existentes por tracking_link_id.
UPDATE public.tracking_events te
SET platform_account_id = tl.platform_account_id,
    platform_id = pa.platform_id,
    campanha_id = COALESCE(te.campanha_id, tl.campanha_id),
    landing_page_id = COALESCE(te.landing_page_id, tl.landing_page_id),
    landing_page_instance_id = COALESCE(te.landing_page_instance_id, tl.landing_page_instance_id),
    updated_at = now()
FROM public.tracking_links tl
JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
WHERE te.tracking_link_id = tl.id
  AND coalesce(te.is_demo, false) = false
  AND (te.platform_account_id IS DISTINCT FROM tl.platform_account_id
       OR te.platform_id IS DISTINCT FROM pa.platform_id
       OR te.campanha_id IS DISTINCT FROM COALESCE(te.campanha_id, tl.campanha_id)
       OR te.landing_page_id IS DISTINCT FROM COALESCE(te.landing_page_id, tl.landing_page_id)
       OR te.landing_page_instance_id IS DISTINCT FROM COALESCE(te.landing_page_instance_id, tl.landing_page_instance_id));

-- 6) Reclassifica eventos antigos de LP sem tracking_link_id pela URL afiliada da instância.
WITH resolved_lpi AS (
  SELECT
    lpi.id AS landing_page_instance_id,
    public.resolve_platform_account_from_url(lpi.affiliate_link) AS account_id
  FROM public.landing_page_instances lpi
  WHERE lpi.affiliate_link IS NOT NULL
    AND btrim(lpi.affiliate_link) <> ''
)
UPDATE public.tracking_events te
SET platform_account_id = rl.account_id,
    platform_id = pa.platform_id,
    updated_at = now()
FROM resolved_lpi rl
JOIN public.platform_accounts pa ON pa.id = rl.account_id
WHERE te.landing_page_instance_id = rl.landing_page_instance_id
  AND coalesce(te.is_demo, false) = false
  AND rl.account_id IS NOT NULL
  AND (te.platform_account_id IS NULL OR te.platform_account_id IS DISTINCT FROM rl.account_id OR te.platform_id IS DISTINCT FROM pa.platform_id);

-- 7) Reclassifica eventos de postback/landing page pelo código real quando ele existir em raw_payload ou click_id.
WITH event_codes AS (
  SELECT
    te.id AS event_id,
    COALESCE(
      NULLIF(te.raw_payload->>'sub1', ''),
      NULLIF(te.raw_payload->>'afp', ''),
      NULLIF(te.raw_payload->>'tracking_code', ''),
      NULLIF(te.click_id, '')
    ) AS code
  FROM public.tracking_events te
  WHERE coalesce(te.is_demo, false) = false
), by_link AS (
  SELECT ec.event_id, tl.id AS tracking_link_id, tl.platform_account_id, pa.platform_id, tl.influencer_id, tl.campanha_id, tl.landing_page_id, tl.landing_page_instance_id
  FROM event_codes ec
  JOIN public.tracking_links tl ON tl.tracking_code = ec.code AND coalesce(tl.is_demo, false) = false
  JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  WHERE ec.code IS NOT NULL AND ec.code <> ''
), by_click AS (
  SELECT DISTINCT ON (ec.event_id)
    ec.event_id, te2.tracking_link_id, te2.platform_account_id, te2.platform_id, te2.influencer_id, te2.campanha_id, te2.landing_page_id, te2.landing_page_instance_id
  FROM event_codes ec
  JOIN public.tracking_events te2 ON te2.click_id = ec.code AND te2.tracking_link_id IS NOT NULL AND coalesce(te2.is_demo, false) = false
  WHERE ec.code IS NOT NULL AND ec.code <> ''
  ORDER BY ec.event_id, te2.event_timestamp DESC
), resolved AS (
  SELECT * FROM by_link
  UNION ALL
  SELECT bc.* FROM by_click bc WHERE NOT EXISTS (SELECT 1 FROM by_link bl WHERE bl.event_id = bc.event_id)
)
UPDATE public.tracking_events te
SET tracking_link_id = COALESCE(te.tracking_link_id, r.tracking_link_id),
    platform_account_id = r.platform_account_id,
    platform_id = r.platform_id,
    influencer_id = COALESCE(te.influencer_id, r.influencer_id),
    campanha_id = COALESCE(te.campanha_id, r.campanha_id),
    landing_page_id = COALESCE(te.landing_page_id, r.landing_page_id),
    landing_page_instance_id = COALESCE(te.landing_page_instance_id, r.landing_page_instance_id),
    updated_at = now()
FROM resolved r
WHERE te.id = r.event_id
  AND r.platform_account_id IS NOT NULL
  AND (te.platform_account_id IS DISTINCT FROM r.platform_account_id
       OR te.platform_id IS DISTINCT FROM r.platform_id
       OR te.tracking_link_id IS DISTINCT FROM COALESCE(te.tracking_link_id, r.tracking_link_id));

-- 8) Índices únicos corrigidos por conta/casa; evita VUPI e Estrela Bet caírem na mesma linha de métrica.
DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation;
DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation_safe;
DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation_account_safe;
DROP INDEX IF EXISTS public.idx_tracking_metrics_smartico_pull;
DROP INDEX IF EXISTS public.idx_tracking_metrics_smartico_pull_account_safe;

CREATE UNIQUE INDEX idx_tracking_metrics_auto_consolidation_account_safe
  ON public.tracking_metrics (
    data_ref,
    COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE origem_importacao = 'auto_consolidation';

CREATE UNIQUE INDEX idx_tracking_metrics_smartico_pull_account_safe
  ON public.tracking_metrics (
    data_ref,
    COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE origem_importacao = 'smartico_api_pull';

-- 9) Consolidação correta por casa/conta, influenciador e campanha.
CREATE OR REPLACE FUNCTION public.reconsolidate_tracking_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _date date;
  _platform_id uuid;
  _platform_account_id uuid;
  _influencer_id uuid;
  _campanha_id uuid;
  _source_row public.tracking_events%ROWTYPE;
BEGIN
  _source_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF COALESCE(_source_row.is_demo, false) THEN
    RETURN _source_row;
  END IF;

  _date := (COALESCE(_source_row.event_timestamp, now()) AT TIME ZONE 'America/Sao_Paulo')::date;
  _platform_id := _source_row.platform_id;
  _platform_account_id := _source_row.platform_account_id;
  _influencer_id := _source_row.influencer_id;
  _campanha_id := _source_row.campanha_id;

  DELETE FROM public.tracking_metrics
  WHERE origem_importacao = 'auto_consolidation'
    AND COALESCE(is_demo, false) = false
    AND data_ref = _date
    AND platform_id IS NOT DISTINCT FROM _platform_id
    AND platform_account_id IS NOT DISTINCT FROM _platform_account_id
    AND influencer_id IS NOT DISTINCT FROM _influencer_id
    AND campanha_id IS NOT DISTINCT FROM _campanha_id;

  INSERT INTO public.tracking_metrics (
    data_ref, platform_id, platform_account_id, influencer_id, campanha_id,
    cliques, registros, ftd, deposits_count, redepositos, redeposits_count,
    depositos_total, revenue, original_amount, original_currency, converted_amount, converted_currency,
    exchange_rate, exchange_rate_timestamp, exchange_rate_source,
    cpa_commission, cpl_commission, revshare_commission, commission_total, qftd_count, qlead_count,
    origem_importacao, is_demo
  )
  SELECT
    _date,
    te.platform_id,
    te.platform_account_id,
    te.influencer_id,
    te.campanha_id,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%'))::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'deposit')::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','redeposit','ftd') THEN COALESCE(te.converted_amount_brl, te.original_amount, te.amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl, te.amount, 0) ELSE 0 END), 0),
    COALESCE((array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL AND te.canonical_event_name IN ('revenue','withdrawable_revenue')))[1], 'BRL'),
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
    'BRL',
    (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1],
    (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1],
    'auto_postback',
    (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric,
    0,
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
    (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric
      + COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
    COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
    'auto_consolidation',
    false
  FROM public.tracking_events te
  LEFT JOIN public.platform_accounts pa ON pa.id = te.platform_account_id
  WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
    AND (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND te.platform_id IS NOT DISTINCT FROM _platform_id
    AND te.platform_account_id IS NOT DISTINCT FROM _platform_account_id
    AND te.influencer_id IS NOT DISTINCT FROM _influencer_id
    AND te.campanha_id IS NOT DISTINCT FROM _campanha_id
  GROUP BY te.platform_id, te.platform_account_id, te.influencer_id, te.campanha_id
  HAVING COUNT(*) FILTER (WHERE te.canonical_event_name IN ('click','registration','ftd','deposit','redeposit','revenue','withdrawable_revenue')) > 0;

  RETURN _source_row;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconsolidate_metrics ON public.tracking_events;
CREATE TRIGGER trg_reconsolidate_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.tracking_events
  FOR EACH ROW EXECUTE FUNCTION public.reconsolidate_tracking_metrics();

-- 10) Recria métricas auto_consolidation existentes já separadas por conta/casa.
DELETE FROM public.tracking_metrics
WHERE origem_importacao = 'auto_consolidation'
  AND COALESCE(is_demo, false) = false;

INSERT INTO public.tracking_metrics (
  data_ref, platform_id, platform_account_id, influencer_id, campanha_id,
  cliques, registros, ftd, deposits_count, redepositos, redeposits_count,
  depositos_total, revenue, original_amount, original_currency, converted_amount, converted_currency,
  exchange_rate, exchange_rate_timestamp, exchange_rate_source,
  cpa_commission, cpl_commission, revshare_commission, commission_total, qftd_count, qlead_count,
  origem_importacao, is_demo
)
SELECT
  (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date,
  te.platform_id,
  te.platform_account_id,
  te.influencer_id,
  te.campanha_id,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%'))::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'deposit')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','redeposit','ftd') THEN COALESCE(te.converted_amount_brl, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl, te.amount, 0) ELSE 0 END), 0),
  COALESCE((array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL AND te.canonical_event_name IN ('revenue','withdrawable_revenue')))[1], 'BRL'),
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  'BRL',
  (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1],
  (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1],
  'auto_postback',
  (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric,
  0,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric
    + COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
  'auto_consolidation',
  false
FROM public.tracking_events te
LEFT JOIN public.platform_accounts pa ON pa.id = te.platform_account_id
WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
GROUP BY (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date, te.platform_id, te.platform_account_id, te.influencer_id, te.campanha_id
HAVING COUNT(*) FILTER (WHERE te.canonical_event_name IN ('click','registration','ftd','deposit','redeposit','revenue','withdrawable_revenue')) > 0;