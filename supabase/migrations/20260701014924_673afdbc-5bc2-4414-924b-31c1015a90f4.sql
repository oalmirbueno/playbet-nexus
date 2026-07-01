
ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS asaas_net_value numeric,
  ADD COLUMN IF NOT EXISTS asaas_gross_value numeric,
  ADD COLUMN IF NOT EXISTS asaas_fee numeric,
  ADD COLUMN IF NOT EXISTS value_divergence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS divergence_reason text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_saques_asaas_payment_id ON public.saques(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_saques_codigo ON public.saques(codigo);
CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_event_id ON public.asaas_webhook_events(event_id);
