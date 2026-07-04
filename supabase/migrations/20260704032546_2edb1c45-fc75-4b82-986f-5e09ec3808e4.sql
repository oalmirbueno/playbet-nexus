DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clicks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_scraper_runs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_reconciliations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.clicks REPLICA IDENTITY FULL;
ALTER TABLE public.panel_scraper_runs REPLICA IDENTITY FULL;
ALTER TABLE public.panel_reconciliations REPLICA IDENTITY FULL;