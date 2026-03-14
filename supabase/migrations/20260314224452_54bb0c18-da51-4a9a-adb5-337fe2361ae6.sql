
-- Add currency conversion fields to tracking_metrics
ALTER TABLE public.tracking_metrics
  ADD COLUMN IF NOT EXISTS original_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS converted_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS converted_currency text DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text DEFAULT NULL;

-- Add same fields to tracking_events for per-event tracking
ALTER TABLE public.tracking_events
  ADD COLUMN IF NOT EXISTS original_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS converted_amount_brl numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate_timestamp timestamptz DEFAULT NULL;
