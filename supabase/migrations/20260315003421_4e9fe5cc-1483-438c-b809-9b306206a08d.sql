
-- Create the partial unique index for auto-consolidation upsert
CREATE UNIQUE INDEX idx_tracking_metrics_auto_consolidation
ON tracking_metrics (data_ref, platform_id)
WHERE origem_importacao = 'auto_consolidation';

-- Delete any existing stale auto_consolidation rows and backfill fresh
DELETE FROM tracking_metrics WHERE origem_importacao = 'auto_consolidation';

INSERT INTO tracking_metrics (
  data_ref, platform_id, platform_account_id,
  cliques, registros, ftd, redepositos, depositos_total, revenue,
  original_amount, original_currency, converted_amount, converted_currency,
  exchange_rate, exchange_rate_timestamp, exchange_rate_source,
  origem_importacao, is_demo
)
SELECT
  (e.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date,
  e.platform_id,
  (array_agg(e.platform_account_id) FILTER (WHERE e.platform_account_id IS NOT NULL))[1],
  COALESCE(SUM(CASE WHEN e.canonical_event_name = 'click' THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name = 'registration' THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name = 'ftd' THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name = 'redeposit' THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name IN ('ftd','deposit') THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name IN ('revenue','ftd','deposit','redeposit') AND e.original_amount IS NOT NULL THEN COALESCE(e.converted_amount_brl, e.original_amount) ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN e.canonical_event_name IN ('revenue','ftd','deposit','redeposit') AND e.original_amount IS NOT NULL THEN e.original_amount ELSE 0 END), 0),
  (array_agg(e.original_currency) FILTER (WHERE e.original_currency IS NOT NULL))[1],
  COALESCE(SUM(CASE WHEN e.canonical_event_name IN ('revenue','ftd','deposit','redeposit') AND e.original_amount IS NOT NULL THEN COALESCE(e.converted_amount_brl, e.original_amount) ELSE 0 END), 0),
  'BRL',
  (array_agg(e.exchange_rate) FILTER (WHERE e.exchange_rate IS NOT NULL))[1],
  (array_agg(e.exchange_rate_timestamp) FILTER (WHERE e.exchange_rate_timestamp IS NOT NULL))[1],
  'auto_postback',
  'auto_consolidation',
  false
FROM tracking_events e
WHERE e.is_demo = false
  AND e.status IS DISTINCT FROM 'invalid_legacy'
  AND e.canonical_event_name NOT LIKE '{%'
  AND (e.click_id IS NULL OR e.click_id NOT LIKE '{%')
  AND (e.click_id IS DISTINCT FROM 'null')
  AND (e.transaction_id IS DISTINCT FROM 'null')
GROUP BY (e.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date, e.platform_id;
