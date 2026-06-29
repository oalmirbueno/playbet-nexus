
-- Audit log for Asaas webhook events (idempotency + traceability)
CREATE TABLE public.asaas_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,
  event_name text NOT NULL,
  asaas_payment_id text,
  external_reference text,
  saque_id uuid REFERENCES public.saques(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.asaas_webhook_events TO authenticated;
GRANT ALL ON public.asaas_webhook_events TO service_role;

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events"
  ON public.asaas_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_asaas_webhook_events_payment ON public.asaas_webhook_events(asaas_payment_id);
CREATE INDEX idx_asaas_webhook_events_saque ON public.asaas_webhook_events(saque_id);
CREATE INDEX idx_asaas_webhook_events_received ON public.asaas_webhook_events(received_at DESC);

-- Keep saques.updated_at fresh on every change (including webhook updates)
CREATE TRIGGER trg_saques_updated_at
  BEFORE UPDATE ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
