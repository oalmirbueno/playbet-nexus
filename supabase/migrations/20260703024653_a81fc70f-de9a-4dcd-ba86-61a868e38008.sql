DROP INDEX IF EXISTS public.tracking_metrics_external_ref_key;
ALTER TABLE public.tracking_metrics
  DROP CONSTRAINT IF EXISTS tracking_metrics_external_ref_key;
ALTER TABLE public.tracking_metrics
  ADD CONSTRAINT tracking_metrics_external_ref_key UNIQUE (external_ref);