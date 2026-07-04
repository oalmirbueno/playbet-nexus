
CREATE TABLE public.link_reconciliations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  period_label text NOT NULL,
  period_start date,
  period_end date NOT NULL,
  platform_id uuid,
  -- totais do dashboard/tracking (tracking_metrics agregado)
  dash_clicks numeric NOT NULL DEFAULT 0,
  dash_registrations numeric NOT NULL DEFAULT 0,
  dash_ftd numeric NOT NULL DEFAULT 0,
  dash_deposits_total numeric NOT NULL DEFAULT 0,
  dash_revenue numeric NOT NULL DEFAULT 0,
  dash_commission numeric NOT NULL DEFAULT 0,
  -- totais somados por link (mesma base filtrada por tracking_link_id NOT NULL)
  links_clicks numeric NOT NULL DEFAULT 0,
  links_registrations numeric NOT NULL DEFAULT 0,
  links_ftd numeric NOT NULL DEFAULT 0,
  links_deposits_total numeric NOT NULL DEFAULT 0,
  links_revenue numeric NOT NULL DEFAULT 0,
  links_commission numeric NOT NULL DEFAULT 0,
  -- diferenças (dash - links)
  diff_clicks numeric NOT NULL DEFAULT 0,
  diff_registrations numeric NOT NULL DEFAULT 0,
  diff_ftd numeric NOT NULL DEFAULT 0,
  diff_deposits_total numeric NOT NULL DEFAULT 0,
  diff_revenue numeric NOT NULL DEFAULT 0,
  diff_commission numeric NOT NULL DEFAULT 0,
  unattributed_link_count integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'ok',
  divergent boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.link_reconciliations TO authenticated;
GRANT ALL ON public.link_reconciliations TO service_role;

CREATE INDEX idx_link_reconciliations_run_at ON public.link_reconciliations (run_at DESC);
CREATE INDEX idx_link_reconciliations_period ON public.link_reconciliations (period_end DESC, period_label);

ALTER TABLE public.link_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read link reconciliations"
  ON public.link_reconciliations FOR SELECT
  TO authenticated
  USING (true);
