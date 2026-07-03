-- Corrige consolidação por conta/casa e separa CPA/Revshare sem misturar Estrela Bet x VUPI.
ALTER TABLE public.tracking_metrics
  ADD COLUMN IF NOT EXISTS cpa_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpl_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revshare_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qftd_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qlead_count integer DEFAULT 0;

DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation;
DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation_safe;
DROP INDEX IF EXISTS public.idx_tracking_metrics_smartico_pull;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_metrics_auto_consolidation_account_safe
  ON public.tracking_metrics (
    data_ref,
    COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE origem_importacao = 'auto_consolidation';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_metrics_smartico_pull_account_safe
  ON public.tracking_metrics (
    data_ref,
    COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE origem_importacao = 'smartico_api_pull';

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
