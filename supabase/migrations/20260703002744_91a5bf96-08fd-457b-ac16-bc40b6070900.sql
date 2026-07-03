DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation;

DELETE FROM public.tracking_metrics tm
WHERE COALESCE(tm.is_demo, false) = false
  AND tm.origem_importacao = 'auto_consolidation';

CREATE UNIQUE INDEX idx_tracking_metrics_auto_consolidation
ON public.tracking_metrics (data_ref, COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE origem_importacao = 'auto_consolidation';

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
  _deposits int;
  _redeposits int;
  _revenue numeric;
  _deposit_total numeric;
  _original_amount numeric;
  _original_currency text;
  _exchange_rate numeric;
  _exchange_rate_ts timestamptz;
BEGIN
  IF COALESCE(NEW.is_demo, false) THEN
    RETURN NEW;
  END IF;

  _date := (COALESCE(NEW.event_timestamp, now()) AT TIME ZONE 'America/Sao_Paulo')::date;
  _platform_id := NEW.platform_id;
  _platform_account_id := NEW.platform_account_id;

  SELECT
    COALESCE(SUM(CASE WHEN canonical_event_name = 'click' AND (click_id IS NULL OR click_id NOT LIKE '{%') THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name IN ('revenue', 'withdrawable_revenue') AND original_amount IS NOT NULL THEN COALESCE(converted_amount_brl, original_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name IN ('deposit','redeposit','ftd') AND original_amount IS NOT NULL THEN COALESCE(converted_amount_brl, original_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name IN ('revenue', 'withdrawable_revenue') AND original_amount IS NOT NULL THEN original_amount ELSE 0 END), 0)
  INTO _clicks, _registrations, _ftd, _deposits, _redeposits, _revenue, _deposit_total, _original_amount
  FROM public.tracking_events
  WHERE COALESCE(is_demo, false) = false
    AND COALESCE(is_duplicate, false) = false
    AND (status IS NULL OR status NOT IN ('invalid_legacy', 'invalid_internal_preview', 'duplicate_technical'))
    AND canonical_event_name NOT LIKE '{%'
    AND NOT (transaction_id IS NOT NULL AND transaction_id LIKE '{%' AND click_id IS NOT NULL AND click_id LIKE '{%')
    AND (event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND platform_id IS NOT DISTINCT FROM _platform_id;

  IF _clicks = 0
     AND _registrations = 0
     AND _ftd = 0
     AND _deposits = 0
     AND _redeposits = 0
     AND COALESCE(_revenue, 0) = 0
     AND COALESCE(_deposit_total, 0) = 0 THEN
    DELETE FROM public.tracking_metrics
    WHERE origem_importacao = 'auto_consolidation'
      AND COALESCE(is_demo, false) = false
      AND data_ref = _date
      AND platform_id IS NOT DISTINCT FROM _platform_id;
    RETURN NEW;
  END IF;

  SELECT te.original_currency, te.exchange_rate, te.exchange_rate_timestamp
  INTO _original_currency, _exchange_rate, _exchange_rate_ts
  FROM public.tracking_events te
  WHERE COALESCE(te.is_demo, false) = false
    AND COALESCE(te.is_duplicate, false) = false
    AND (te.status IS NULL OR te.status NOT IN ('invalid_legacy', 'invalid_internal_preview', 'duplicate_technical'))
    AND te.canonical_event_name IN ('revenue', 'withdrawable_revenue')
    AND te.original_currency IS NOT NULL
    AND (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND te.platform_id IS NOT DISTINCT FROM _platform_id
  ORDER BY te.event_timestamp DESC
  LIMIT 1;

  UPDATE public.tracking_metrics
  SET platform_account_id = _platform_account_id,
      cliques = _clicks,
      registros = _registrations,
      ftd = _ftd,
      redepositos = _redeposits,
      depositos_total = _deposits + _ftd,
      revenue = _revenue,
      original_amount = _original_amount,
      original_currency = _original_currency,
      converted_amount = _revenue,
      converted_currency = 'BRL',
      exchange_rate = _exchange_rate,
      exchange_rate_timestamp = _exchange_rate_ts,
      exchange_rate_source = 'auto_postback',
      updated_at = now()
  WHERE origem_importacao = 'auto_consolidation'
    AND COALESCE(is_demo, false) = false
    AND data_ref = _date
    AND platform_id IS NOT DISTINCT FROM _platform_id;

  IF NOT FOUND THEN
    INSERT INTO public.tracking_metrics (
      data_ref, platform_id, platform_account_id,
      cliques, registros, ftd, redepositos, depositos_total, revenue,
      original_amount, original_currency, converted_amount, converted_currency,
      exchange_rate, exchange_rate_timestamp, exchange_rate_source,
      origem_importacao, is_demo
    ) VALUES (
      _date, _platform_id, _platform_account_id,
      _clicks, _registrations, _ftd, _redeposits, _deposits + _ftd, _revenue,
      _original_amount, _original_currency, _revenue, 'BRL',
      _exchange_rate, _exchange_rate_ts, 'auto_postback',
      'auto_consolidation', false
    )
    ON CONFLICT (data_ref, COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE origem_importacao = 'auto_consolidation'
    DO UPDATE SET
      platform_account_id = EXCLUDED.platform_account_id,
      cliques = EXCLUDED.cliques,
      registros = EXCLUDED.registros,
      ftd = EXCLUDED.ftd,
      redepositos = EXCLUDED.redepositos,
      depositos_total = EXCLUDED.depositos_total,
      revenue = EXCLUDED.revenue,
      original_amount = EXCLUDED.original_amount,
      original_currency = EXCLUDED.original_currency,
      converted_amount = EXCLUDED.converted_amount,
      converted_currency = EXCLUDED.converted_currency,
      exchange_rate = EXCLUDED.exchange_rate,
      exchange_rate_timestamp = EXCLUDED.exchange_rate_timestamp,
      exchange_rate_source = EXCLUDED.exchange_rate_source,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.tracking_metrics (
  data_ref,
  platform_id,
  platform_account_id,
  cliques,
  registros,
  ftd,
  redepositos,
  depositos_total,
  revenue,
  original_amount,
  original_currency,
  converted_amount,
  converted_currency,
  exchange_rate,
  exchange_rate_timestamp,
  exchange_rate_source,
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
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0)::int AS redepositos,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','ftd') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0) AS depositos_total,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue', 'withdrawable_revenue') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0) AS revenue,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue', 'withdrawable_revenue') AND te.original_amount IS NOT NULL THEN te.original_amount ELSE 0 END), 0) AS original_amount,
  (array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL))[1] AS original_currency,
  COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue', 'withdrawable_revenue') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0) AS converted_amount,
  'BRL' AS converted_currency,
  (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1] AS exchange_rate,
  (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1] AS exchange_rate_timestamp,
  'auto_postback' AS exchange_rate_source,
  'auto_consolidation' AS origem_importacao,
  false AS is_demo
FROM public.tracking_events te
WHERE COALESCE(te.is_demo, false) = false
  AND COALESCE(te.is_duplicate, false) = false
  AND (te.status IS NULL OR te.status NOT IN ('invalid_legacy', 'invalid_internal_preview', 'duplicate_technical'))
  AND te.canonical_event_name NOT LIKE '{%'
  AND NOT (te.transaction_id IS NOT NULL AND te.transaction_id LIKE '{%' AND te.click_id IS NOT NULL AND te.click_id LIKE '{%')
GROUP BY (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date, te.platform_id
HAVING
  COALESCE(SUM(CASE WHEN te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%') THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0) > 0
  OR COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue', 'withdrawable_revenue') AND te.original_amount IS NOT NULL THEN COALESCE(te.converted_amount_brl, te.original_amount) ELSE 0 END), 0) > 0;