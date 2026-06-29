
-- 1. Add brand_id mapping field to platforms for Smartico/TAP integration
ALTER TABLE public.platforms
  ADD COLUMN IF NOT EXISTS smartico_brand_id text;

-- 2. Unique index for upsert on smartico_api_pull source
-- One row per (date, platform, influencer). NULL influencer = aggregate row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_metrics_smartico_pull
  ON public.tracking_metrics (
    data_ref,
    platform_id,
    COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE origem_importacao = 'smartico_api_pull';

-- 3. Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Schedule the puller every 30 minutes
-- Remove any prior schedule with the same name first
DO $$
BEGIN
  PERFORM cron.unschedule('tracking-puller-smartico-30min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'tracking-puller-smartico-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-puller-smartico',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcnJiem5oYXRkcWNtZnl6Z2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjY2ODQsImV4cCI6MjA4ODM0MjY4NH0.iBZPiW9-3Wu7PzXVpaiJp4oxIYmqMx4HxucuSfy6G_8'
    ),
    body := jsonb_build_object('source', 'cron', 'mode', 'recent')
  ) AS request_id;
  $$
);
