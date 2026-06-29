ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS asaas_status text,
  ADD COLUMN IF NOT EXISTS asaas_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text;
CREATE INDEX IF NOT EXISTS idx_saques_asaas_payment_id ON public.saques (asaas_payment_id);