
-- 1. Balance columns on platform_accounts
ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS balance_available numeric(14,2),
  ADD COLUMN IF NOT EXISTS balance_pending numeric(14,2),
  ADD COLUMN IF NOT EXISTS balance_currency text DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS balance_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_source text;

-- 2. platform_withdrawals table
CREATE TABLE IF NOT EXISTS public.platform_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_account_id uuid NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL,
  paid_at timestamptz,
  amount_gross numeric(14,2) NOT NULL DEFAULT 0,
  amount_net numeric(14,2) NOT NULL DEFAULT 0,
  fee numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  method text,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_account_id, external_id)
);

GRANT SELECT ON public.platform_withdrawals TO authenticated;
GRANT ALL ON public.platform_withdrawals TO service_role;

ALTER TABLE public.platform_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read platform_withdrawals"
  ON public.platform_withdrawals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage platform_withdrawals"
  ON public.platform_withdrawals FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages platform_withdrawals"
  ON public.platform_withdrawals FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_platform_withdrawals_account_requested
  ON public.platform_withdrawals (platform_account_id, requested_at DESC);

CREATE TRIGGER platform_withdrawals_updated_at
  BEFORE UPDATE ON public.platform_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
