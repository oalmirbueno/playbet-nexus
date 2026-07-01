-- Ensure full row payload on realtime events (needed for reliable UPDATE/DELETE deltas)
ALTER TABLE public.tracking_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_events REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_links REPLICA IDENTITY FULL;
ALTER TABLE public.saques REPLICA IDENTITY FULL;
ALTER TABLE public.influencers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tracking_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tracking_links') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_links;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='saques') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saques;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='influencers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.influencers;
  END IF;
END $$;