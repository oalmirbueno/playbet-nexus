
CREATE OR REPLACE FUNCTION public.reconsolidate_tracking_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  _original_amount numeric;
  _original_currency text;
  _exchange_rate numeric;
  _exchange_rate_ts timestamptz;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;
  IF NEW.status = 'invalid_legacy' THEN RETURN NEW; END IF;
  IF NEW.canonical_event_name LIKE '{%' THEN RETURN NEW; END IF;
  IF NEW.click_id LIKE '{%' THEN RETURN NEW; END IF;
  IF NEW.click_id = 'null' OR NEW.transaction_id = 'null' THEN RETURN NEW; END IF;

  _date := (NEW.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date;
  _platform_id := NEW.platform_id;
  _platform_account_id := NEW.platform_account_id;

  SELECT
    COALESCE(SUM(CASE WHEN canonical_event_name = 'click' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'deposit' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name IN ('revenue','ftd','deposit','redeposit') AND original_amount IS NOT NULL THEN COALESCE(converted_amount_brl, original_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN canonical_event_name IN ('revenue','ftd','deposit','redeposit') AND original_amount IS NOT NULL THEN original_amount ELSE 0 END), 0)
  INTO _clicks, _registrations, _ftd, _deposits, _redeposits, _revenue, _original_amount
  FROM tracking_events
  WHERE is_demo = false
    AND status IS DISTINCT FROM 'invalid_legacy'
    AND canonical_event_name NOT LIKE '{%'
    AND (click_id IS NULL OR click_id NOT LIKE '{%')
    AND (click_id IS DISTINCT FROM 'null')
    AND (transaction_id IS DISTINCT FROM 'null')
    AND (event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND platform_id IS NOT DISTINCT FROM _platform_id;

  SELECT te.original_currency, te.exchange_rate, te.exchange_rate_timestamp
  INTO _original_currency, _exchange_rate, _exchange_rate_ts
  FROM tracking_events te
  WHERE te.is_demo = false
    AND te.original_currency IS NOT NULL
    AND (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = _date
    AND te.platform_id IS NOT DISTINCT FROM _platform_id
  ORDER BY te.event_timestamp DESC
  LIMIT 1;

  INSERT INTO tracking_metrics (
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
  ON CONFLICT (data_ref, platform_id) WHERE origem_importacao = 'auto_consolidation'
  DO UPDATE SET
    cliques = EXCLUDED.cliques,
    registros = EXCLUDED.registros,
    ftd = EXCLUDED.ftd,
    redepositos = EXCLUDED.redepositos,
    depositos_total = EXCLUDED.depositos_total,
    revenue = EXCLUDED.revenue,
    original_amount = EXCLUDED.original_amount,
    original_currency = EXCLUDED.original_currency,
    converted_amount = EXCLUDED.converted_amount,
    exchange_rate = EXCLUDED.exchange_rate,
    exchange_rate_timestamp = EXCLUDED.exchange_rate_timestamp,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reconsolidate_metrics
AFTER INSERT ON tracking_events
FOR EACH ROW
EXECUTE FUNCTION reconsolidate_tracking_metrics();
