ALTER TABLE public.tracking_metrics
  ADD COLUMN IF NOT EXISTS external_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS tracking_metrics_external_ref_key
  ON public.tracking_metrics (external_ref)
  WHERE external_ref IS NOT NULL;

COMMENT ON COLUMN public.tracking_metrics.external_ref IS
  'Chave estável de origem externa (ex: "estrelabet:2026-07-05:CAMPAIGN"). Usada como conflict target em upserts vindos de scrapers/APIs de parceiros.';