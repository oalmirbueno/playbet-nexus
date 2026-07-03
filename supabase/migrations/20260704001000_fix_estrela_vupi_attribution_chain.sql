-- Correção definitiva da cadeia de atribuição Estrela Bet x VUPI/Vipi.
-- A casa vem do link/código real do afiliado, nunca do nome genérico da plataforma TAP/Smartico.

-- 1) Catálogo de domínios sem colisão.
UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domains, '{}'::text[])) d
      WHERE lower(btrim(d)) NOT IN ('estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro')
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domain_patterns, '{}'::text[])) d
      WHERE lower(btrim(d)) NOT IN ('estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro')
    )
WHERE lower(coalesce(name,'') || ' ' || coalesce(slug,'')) ~ '(vupi|vipi)';

UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domains, '{}'::text[]) || ARRAY['vupi.bet.br','vupi.com.br','go.aff.vupipartners.com','vupipartners.com','partners.vupi.com.br','go.vupi.com.br']) d
      WHERE d IS NOT NULL AND btrim(d) <> ''
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domain_patterns, '{}'::text[]) || ARRAY['vupi.bet.br','vupi.com.br','go.aff.vupipartners.com','vupipartners.com','partners.vupi.com.br','go.vupi.com.br']) d
      WHERE d IS NOT NULL AND btrim(d) <> ''
    )
WHERE lower(coalesce(name,'') || ' ' || coalesce(slug,'')) ~ '(vupi|vipi)';

UPDATE public.platforms
SET domains = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domains, '{}'::text[]) || ARRAY['estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro']) d
      WHERE d IS NOT NULL AND btrim(d) <> ''
    ),
    domain_patterns = ARRAY(
      SELECT DISTINCT d FROM unnest(coalesce(domain_patterns, '{}'::text[]) || ARRAY['estrelabet.bet.br','go.aff.estrelabetpartners.com','go.lkrh.pro','go.estrelabet.com','aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro']) d
      WHERE d IS NOT NULL AND btrim(d) <> ''
    )
WHERE lower(coalesce(name,'') || ' ' || coalesce(slug,'')) LIKE '%estrela%';

-- 2) Resolver por host específico: domínio mais longo vence.
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
  IF _url IS NULL OR btrim(_url) = '' THEN RETURN NULL; END IF;
  BEGIN
    host := lower(regexp_replace(regexp_replace(split_part(split_part(CASE WHEN _url ~* '^[a-z][a-z0-9+.-]*://' THEN _url ELSE 'https://' || _url END, '://', 2), '/', 1), '^www\.', ''), ':\d+$', ''));
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF host IS NULL OR host = '' THEN RETURN NULL; END IF;

  SELECT p.id INTO best_platform
  FROM public.platforms p
  CROSS JOIN LATERAL unnest(coalesce(p.domains, '{}'::text[]) || coalesce(p.domain_patterns, '{}'::text[])) d
  WHERE d IS NOT NULL AND btrim(d) <> ''
    AND (host = lower(btrim(d)) OR host LIKE '%.' || lower(btrim(d)))
  ORDER BY length(btrim(d)) DESC, p.created_at ASC NULLS LAST
  LIMIT 1;

  IF best_platform IS NULL THEN RETURN NULL; END IF;

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

-- 3) Links sempre seguem a conta real do domínio do link afiliado.
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
  resolved_acc := public.resolve_platform_account_from_url(COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, '')));
  IF resolved_acc IS NULL THEN RETURN NEW; END IF;
  SELECT platform_id INTO resolved_platform FROM public.platform_accounts WHERE id = resolved_acc;
  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT platform_id INTO chosen_platform FROM public.platform_accounts WHERE id = NEW.platform_account_id;
    IF chosen_platform IS NOT NULL AND chosen_platform = resolved_platform THEN RETURN NEW; END IF;
  END IF;
  NEW.platform_account_id := resolved_acc;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tracking_link_platform_match ON public.tracking_links;
CREATE TRIGGER trg_enforce_tracking_link_platform_match
BEFORE INSERT OR UPDATE OF base_url, short_url, platform_account_id ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.enforce_tracking_link_platform_match();

WITH r AS (
  SELECT id, public.resolve_platform_account_from_url(COALESCE(NULLIF(base_url,''), NULLIF(short_url,''))) acc
  FROM public.tracking_links
  WHERE coalesce(is_demo,false) = false
)
UPDATE public.tracking_links tl
SET platform_account_id = r.acc, updated_at = now()
FROM r
WHERE tl.id = r.id AND r.acc IS NOT NULL AND tl.platform_account_id IS DISTINCT FROM r.acc;

-- 4) Instância de LP guarda o tracking_link que a criou; isso evita cair no "último link" do influencer.
WITH by_code AS (
  SELECT DISTINCT ON (lpi.id) lpi.id lpi_id, tl.id tl_id
  FROM public.landing_page_instances lpi
  JOIN public.tracking_links tl
    ON tl.influencer_id = lpi.influencer_id
   AND coalesce(tl.is_demo,false) = false
   AND (position('sub1=' || tl.tracking_code in coalesce(lpi.affiliate_link,'')) > 0
        OR position('afp=' || tl.tracking_code in coalesce(lpi.affiliate_link,'')) > 0
        OR tl.landing_page_instance_id = lpi.id)
  ORDER BY lpi.id, (tl.landing_page_instance_id = lpi.id) DESC, tl.updated_at DESC NULLS LAST, tl.created_at DESC NULLS LAST
)
UPDATE public.landing_page_instances lpi
SET source_tracking_link_id = by_code.tl_id, updated_at = now()
FROM by_code
WHERE lpi.id = by_code.lpi_id
  AND lpi.source_tracking_link_id IS DISTINCT FROM by_code.tl_id;

-- 5) Clique da LP usa tracking_link_id/click_id real enviado pelo front, não clicks.id nem fallback genérico.
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
      OR (NEW.tracking_link_id IS NULL AND NEW.landing_page_instance_id IS NULL AND tl.influencer_id = NEW.influencer_id AND (NEW.landing_page_id IS NULL OR tl.landing_page_id = NEW.landing_page_id OR tl.landing_page_id IS NULL))
    )
  ORDER BY (tl.id = NEW.tracking_link_id) DESC NULLS LAST,
           (tl.id = lpi.source_tracking_link_id) DESC NULLS LAST,
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
    jsonb_build_object('user_agent', NEW.user_agent, 'referrer', NEW.referrer, 'route', NEW.route, 'source', NEW.source, 'ip_address', NEW.ip_address, 'tracking_link_id', NEW.tracking_link_id, 'landing_page_instance_id', NEW.landing_page_instance_id),
    false
  );
  RETURN NEW;
END;
$$;

-- 6) Reatribui eventos existentes por ordem de confiança: tracking_link_id > código sub1/afp > click_id gerado clk_.
UPDATE public.tracking_events te
SET platform_account_id = tl.platform_account_id,
    platform_id = pa.platform_id,
    influencer_id = COALESCE(te.influencer_id, tl.influencer_id),
    campanha_id = COALESCE(te.campanha_id, tl.campanha_id),
    landing_page_id = COALESCE(te.landing_page_id, tl.landing_page_id),
    landing_page_instance_id = COALESCE(te.landing_page_instance_id, tl.landing_page_instance_id),
    updated_at = now()
FROM public.tracking_links tl
JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
WHERE te.tracking_link_id = tl.id
  AND coalesce(te.is_demo,false) = false
  AND te.platform_account_id IS DISTINCT FROM tl.platform_account_id;

WITH codes AS (
  SELECT te.id event_id, COALESCE(NULLIF(te.raw_payload->>'sub1',''), NULLIF(te.raw_payload->>'afp',''), NULLIF(te.raw_payload->>'tracking_code',''), NULLIF(te.click_id,'')) code
  FROM public.tracking_events te
  WHERE coalesce(te.is_demo,false) = false
), resolved AS (
  SELECT c.event_id, tl.id tl_id, tl.platform_account_id, pa.platform_id, tl.influencer_id, tl.campanha_id, tl.landing_page_id, tl.landing_page_instance_id
  FROM codes c
  JOIN public.tracking_links tl ON tl.tracking_code = c.code AND coalesce(tl.is_demo,false) = false
  JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
), click_chain AS (
  SELECT DISTINCT ON (c.event_id) c.event_id, clk.tracking_link_id tl_id, clk.platform_account_id, clk.platform_id, clk.influencer_id, clk.campanha_id, clk.landing_page_id, clk.landing_page_instance_id
  FROM codes c
  JOIN public.tracking_events clk ON clk.click_id = c.code AND clk.tracking_link_id IS NOT NULL AND clk.canonical_event_name = 'click' AND coalesce(clk.is_demo,false) = false
  WHERE NOT EXISTS (SELECT 1 FROM resolved r WHERE r.event_id = c.event_id)
  ORDER BY c.event_id, clk.event_timestamp DESC
), all_resolved AS (
  SELECT * FROM resolved
  UNION ALL
  SELECT * FROM click_chain
)
UPDATE public.tracking_events te
SET tracking_link_id = COALESCE(te.tracking_link_id, ar.tl_id),
    platform_account_id = ar.platform_account_id,
    platform_id = ar.platform_id,
    influencer_id = COALESCE(te.influencer_id, ar.influencer_id),
    campanha_id = COALESCE(te.campanha_id, ar.campanha_id),
    landing_page_id = COALESCE(te.landing_page_id, ar.landing_page_id),
    landing_page_instance_id = COALESCE(te.landing_page_instance_id, ar.landing_page_instance_id),
    updated_at = now()
FROM all_resolved ar
WHERE te.id = ar.event_id
  AND ar.platform_account_id IS NOT NULL
  AND (te.platform_account_id IS DISTINCT FROM ar.platform_account_id OR te.tracking_link_id IS DISTINCT FROM COALESCE(te.tracking_link_id, ar.tl_id));

-- 7) Recria métricas automáticas já separadas por platform_account_id.
DELETE FROM public.tracking_metrics WHERE origem_importacao = 'auto_consolidation' AND coalesce(is_demo,false) = false;
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
  te.platform_id, te.platform_account_id, te.influencer_id, te.campanha_id,
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
  (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric + COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
  COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
  'auto_consolidation', false
FROM public.tracking_events te
LEFT JOIN public.platform_accounts pa ON pa.id = te.platform_account_id
WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
GROUP BY (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date, te.platform_id, te.platform_account_id, te.influencer_id, te.campanha_id
HAVING COUNT(*) FILTER (WHERE te.canonical_event_name IN ('click','registration','ftd','deposit','redeposit','revenue','withdrawable_revenue')) > 0;
