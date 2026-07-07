ALTER TABLE public.platform_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_metrics REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tracking_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_metrics;
  END IF;
END $$;