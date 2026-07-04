
CREATE TABLE public.odds_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  period_label text NOT NULL,
  period_start date,
  period_end date NOT NULL,
  platform_id uuid,
  odds_links_total integer NOT NULL DEFAULT 0,
  odds_links_single integer NOT NULL DEFAULT 0,
  odds_links_multipla integer NOT NULL DEFAULT 0,
  odds_links_sistema integer NOT NULL DEFAULT 0,
  odds_avg_total_odd numeric NOT NULL DEFAULT 0,
  odds_selections_total integer NOT NULL DEFAULT 0,
  materials_total integer NOT NULL DEFAULT 0,
  materials_ready integer NOT NULL DEFAULT 0,
  materials_failed integer NOT NULL DEFAULT 0,
  links_without_material integer NOT NULL DEFAULT 0,
  links_without_bookmaker_url integer NOT NULL DEFAULT 0,
  links_without_screenshot integer NOT NULL DEFAULT 0,
  links_expired_event integer NOT NULL DEFAULT 0,
  odds_links_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL DEFAULT 'ok',
  divergent boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT odds_reconciliations_severity_check CHECK (severity IN ('ok','minor','major','critical'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.odds_reconciliations TO authenticated;
GRANT ALL ON public.odds_reconciliations TO service_role;

ALTER TABLE public.odds_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read odds reconciliations"
  ON public.odds_reconciliations FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_odds_reconciliations_run_at ON public.odds_reconciliations (run_at DESC);
CREATE INDEX idx_odds_reconciliations_period ON public.odds_reconciliations (period_end DESC, period_label);
