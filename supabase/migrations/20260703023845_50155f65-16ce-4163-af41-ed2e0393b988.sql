CREATE TABLE public.panel_scraper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_key text NOT NULL,
  platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_imported int NOT NULL DEFAULT 0,
  message text,
  discovery jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX panel_scraper_runs_key_started_idx
  ON public.panel_scraper_runs (scraper_key, started_at DESC);

GRANT SELECT ON public.panel_scraper_runs TO authenticated;
GRANT ALL ON public.panel_scraper_runs TO service_role;

ALTER TABLE public.panel_scraper_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read scraper runs"
  ON public.panel_scraper_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
