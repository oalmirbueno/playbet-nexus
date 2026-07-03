-- Ensure pg_cron + pg_net are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove previous schedule if present
DO $$
BEGIN
  PERFORM cron.unschedule('stellar-panel-scraper-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stellar-panel-scraper-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'stellar-panel-scraper-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/stellar-panel-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcnJiem5oYXRkcWNtZnl6Z2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjY2ODQsImV4cCI6MjA4ODM0MjY4NH0.iBZPiW9-3Wu7PzXVpaiJp4oxIYmqMx4HxucuSfy6G_8'
    ),
    body := '{}'::jsonb
  );
  $$
);
