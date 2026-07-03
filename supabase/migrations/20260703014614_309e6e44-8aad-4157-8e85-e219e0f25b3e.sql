ALTER TABLE public.tracking_metrics
  ADD COLUMN IF NOT EXISTS cpa_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpl_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revshare_commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qftd_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qlead_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tracking_events_consolidation_lookup
  ON public.tracking_events (((event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date), platform_id)
  WHERE COALESCE(is_demo, false) = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_metrics_auto_consolidation_safe
  ON public.tracking_metrics (data_ref, COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE origem_importacao = 'auto_consolidation';

CREATE OR REPLACE FUNCTION public.tracking_event_is_valid_for_metrics(
  _is_demo boolean,
  _is_duplicate boolean,
  _status text,
  _canonical_event_name text,
  _transaction_id text,
  _click_id text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(_is_demo, false) = false
    AND COALESCE(_is_duplicate, false) = false
    AND (_status IS NULL OR _status NOT IN ('invalid_legacy', 'invalid_internal_preview', 'duplicate_technical'))
    AND COALESCE(_canonical_event_name, '') <> ''
    AND _canonical_event_name NOT LIKE '{%'
    AND NOT (_transaction_id IS NOT NULL AND _transaction_id LIKE '{%' AND _click_id IS NOT NULL AND _click_id LIKE '{%')
$$;

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
  _clicks int;
  _registrations int;
  _ftd int;
  _deposits_count int;
  _redeposits int;
  _deposit_total numeric;
  _revenue numeric;
  _original_amount numeric;
  _original_currency text;
  _exchange_rate numeric;
  _exchange_rate_ts timestamptz;
  _source_row public.tracking_events%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _source_row := OLD;
  ELSE
    _source_row := NEW;
  END IF;

  IF COALESCE(_source_row.is_demo, false) THEN
    RETURN _source_row;
  END IF;

  _date := (COALESCE(_source_row.event_timestamp, now()) AT TIME ZONE 'America/Sao_Paulo')::date;
  _platform_id := _source_row.platform_id;

  SELECT
    (array_agg(te.platform_account_id ORDER BY te.event_timestamp DESC) FILTER (WHERE te.platform_account_id IS NOT NULL))[1],
    COALESCE(SUM(CASE WHEN te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%') THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','redeposit','ftd') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) ELSE 0 END), 0),
    (array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL AND te.canonical_event_name IN ('revenue','withdrawable_revenue')))[1],
    (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1],
    (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1]
  INTO _platform_account_id, _clicks, _registrations, _ftd, _deposits_count, _redeposits, _deposit_total, _revenue, _original_amount, _original_currency, _exchange_rate, _exchange_rate_ts
  FROM public.tracking_events te
  WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
    AND (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND te.platform_id IS NOT DISTINCT FROM _platform_id;

  IF COALESCE(_clicks, 0) = 0
     AND COALESCE(_registrations, 0) = 0
     AND COALESCE(_ftd, 0) = 0
     AND COALESCE(_deposits_count, 0) = 0
     AND COALESCE(_redeposits, 0) = 0
     AND COALESCE(_deposit_total, 0) = 0
     AND COALESCE(_revenue, 0) = 0 THEN
    DELETE FROM public.tracking_metrics
    WHERE origem_importacao = 'auto_consolidation'
      AND COALESCE(is_demo, false) = false
      AND data_ref = _date
      AND platform_id IS NOT DISTINCT FROM _platform_id;
    RETURN _source_row;
  END IF;

  UPDATE public.tracking_metrics
  SET platform_account_id = _platform_account_id,
      cliques = COALESCE(_clicks, 0),
      registros = COALESCE(_registrations, 0),
      ftd = COALESCE(_ftd, 0),
      deposits_count = COALESCE(_deposits_count, 0),
      redepositos = COALESCE(_redeposits, 0),
      redeposits_count = COALESCE(_redeposits, 0),
      depositos_total = COALESCE(_deposit_total, 0),
      revenue = COALESCE(_revenue, 0),
      original_amount = COALESCE(_original_amount, 0),
      original_currency = COALESCE(_original_currency, 'BRL'),
      converted_amount = COALESCE(_revenue, 0),
      converted_currency = 'BRL',
      exchange_rate = _exchange_rate,
      exchange_rate_timestamp = _exchange_rate_ts,
      exchange_rate_source = 'auto_postback',
      commission_total = COALESCE(_revenue, 0),
      updated_at = now()
  WHERE origem_importacao = 'auto_consolidation'
    AND COALESCE(is_demo, false) = false
    AND data_ref = _date
    AND platform_id IS NOT DISTINCT FROM _platform_id;

  IF NOT FOUND THEN
    INSERT INTO public.tracking_metrics (
      data_ref, platform_id, platform_account_id,
      cliques, registros, ftd, deposits_count, redepositos, redeposits_count,
      depositos_total, revenue,
      original_amount, original_currency, converted_amount, converted_currency,
      exchange_rate, exchange_rate_timestamp, exchange_rate_source,
      commission_total, origem_importacao, is_demo
    ) VALUES (
      _date, _platform_id, _platform_account_id,
      COALESCE(_clicks, 0), COALESCE(_registrations, 0), COALESCE(_ftd, 0), COALESCE(_deposits_count, 0), COALESCE(_redeposits, 0), COALESCE(_redeposits, 0),
      COALESCE(_deposit_total, 0), COALESCE(_revenue, 0),
      COALESCE(_original_amount, 0), COALESCE(_original_currency, 'BRL'), COALESCE(_revenue, 0), 'BRL',
      _exchange_rate, _exchange_rate_ts, 'auto_postback',
      COALESCE(_revenue, 0), 'auto_consolidation', false
    )
    ON CONFLICT (data_ref, COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE origem_importacao = 'auto_consolidation'
    DO UPDATE SET
      platform_account_id = EXCLUDED.platform_account_id,
      cliques = EXCLUDED.cliques,
      registros = EXCLUDED.registros,
      ftd = EXCLUDED.ftd,
      deposits_count = EXCLUDED.deposits_count,
      redepositos = EXCLUDED.redepositos,
      redeposits_count = EXCLUDED.redeposits_count,
      depositos_total = EXCLUDED.depositos_total,
      revenue = EXCLUDED.revenue,
      original_amount = EXCLUDED.original_amount,
      original_currency = EXCLUDED.original_currency,
      converted_amount = EXCLUDED.converted_amount,
      converted_currency = EXCLUDED.converted_currency,
      exchange_rate = EXCLUDED.exchange_rate,
      exchange_rate_timestamp = EXCLUDED.exchange_rate_timestamp,
      exchange_rate_source = EXCLUDED.exchange_rate_source,
      commission_total = EXCLUDED.commission_total,
      updated_at = now();
  END IF;

  RETURN _source_row;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconsolidate_metrics ON public.tracking_events;
CREATE TRIGGER trg_reconsolidate_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.reconsolidate_tracking_metrics();

DELETE FROM public.tracking_metrics
WHERE origem_importacao = 'auto_consolidation'
  AND COALESCE(is_demo, false) = false;

INSERT INTO public.tracking_metrics (
  data_ref,
  platform_id,
  platform_account_id,
  cliques,
  registros,
  ftd,
  deposits_count,
  redepositos,
  redeposits_count,
  depositos_total,
  revenue,
  original_amount,
  original_currency,
  converted_amount,
  converted_currency,
  exchange_rate,
  exchange_rate_timestamp,
  exchange_rate_source,
  commission_total,
  origem_importacao,
  is_demo
)
SELECT
  (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS data_ref,
  te.platform_id,
  (array_agg(te.platform_account_id ORDER BY te.event_timestamp DESC) FILTER (WHERE te.platform_account_id IS NOT NULL))[1] AS platform_account_id,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%') THEN 1 ELSE 0 END), 0)::int AS cliques,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0)::int AS registros,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0)::int AS ftd,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0)::int AS deposits_count,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0)::int AS redepositos,
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0)::int AS redeposits_count,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','redeposit','ftd') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0) AS depositos_total,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount) ELSE 0 END), 0) AS revenue,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) ELSE 0 END), 0) AS original_amount,
  COALESCE((array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL AND te.canonical_event_name IN ('revenue','withdrawable_revenue')))[1], 'BRL') AS original_currency,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount) ELSE 0 END), 0) AS converted_amount,
  'BRL' AS converted_currency,
  (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1] AS exchange_rate,
  (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1] AS exchange_rate_timestamp,
  'auto_postback' AS exchange_rate_source,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount) ELSE 0 END), 0) AS commission_total,
  'auto_consolidation' AS origem_importacao,
  false AS is_demo
FROM public.tracking_events te
WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
GROUP BY (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date, te.platform_id
HAVING
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%') THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') AND COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl) IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount) ELSE 0 END), 0) > 0;