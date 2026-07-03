DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='link_materials'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.link_materials';
  END IF;
END $$;
ALTER TABLE public.link_materials REPLICA IDENTITY FULL;
ALTER TABLE public.landing_page_instances REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_links REPLICA IDENTITY FULL;