
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tracking_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events';
  END IF;
END $$;
ALTER TABLE public.tracking_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_events REPLICA IDENTITY FULL;
