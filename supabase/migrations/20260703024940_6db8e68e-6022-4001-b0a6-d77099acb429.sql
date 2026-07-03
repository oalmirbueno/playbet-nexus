
CREATE TABLE IF NOT EXISTS public.panel_reconciliations (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  scraper_key text not null default 'stellar',
  brand_slug text not null,
  brand_name text,
  data_ref date not null,
  panel_registrations int not null default 0,
  panel_ftds int not null default 0,
  panel_deposits_count int not null default 0,
  panel_deposits_total numeric(14,2) not null default 0,
  panel_ngr numeric(14,2) not null default 0,
  panel_commission numeric(14,2) not null default 0,
  db_registrations int not null default 0,
  db_ftds int not null default 0,
  db_deposits_count int not null default 0,
  db_deposits_total numeric(14,2) not null default 0,
  db_ngr numeric(14,2) not null default 0,
  db_commission numeric(14,2) not null default 0,
  diff_registrations int generated always as (panel_registrations - db_registrations) stored,
  diff_ftds int generated always as (panel_ftds - db_ftds) stored,
  diff_deposits_count int generated always as (panel_deposits_count - db_deposits_count) stored,
  diff_deposits_total numeric(14,2) generated always as (panel_deposits_total - db_deposits_total) stored,
  diff_ngr numeric(14,2) generated always as (panel_ngr - db_ngr) stored,
  diff_commission numeric(14,2) generated always as (panel_commission - db_commission) stored,
  severity text not null default 'ok', -- ok | minor | major | critical
  divergent boolean not null default false,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (scraper_key, brand_slug, data_ref, run_at)
);

CREATE INDEX IF NOT EXISTS idx_panel_reconciliations_ref
  ON public.panel_reconciliations (data_ref desc, brand_slug);
CREATE INDEX IF NOT EXISTS idx_panel_reconciliations_divergent
  ON public.panel_reconciliations (divergent, severity, run_at desc);

GRANT SELECT ON public.panel_reconciliations TO authenticated;
GRANT ALL ON public.panel_reconciliations TO service_role;

ALTER TABLE public.panel_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read reconciliations"
  ON public.panel_reconciliations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages reconciliations"
  ON public.panel_reconciliations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
