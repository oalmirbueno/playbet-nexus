
CREATE TABLE IF NOT EXISTS public.tracking_link_odds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_link_id UUID NOT NULL UNIQUE REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  bet_type TEXT NOT NULL DEFAULT 'single' CHECK (bet_type IN ('single','multipla','sistema')),
  total_odd NUMERIC(10,2),
  stake_suggested NUMERIC(12,2),
  selections JSONB NOT NULL DEFAULT '[]'::jsonb,
  bookmaker_share_url TEXT,
  screenshot_url TEXT,
  event_starts_at TIMESTAMPTZ,
  event_label TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','live','won','lost','void','cashout')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_link_odds TO authenticated;
GRANT ALL ON public.tracking_link_odds TO service_role;
GRANT SELECT ON public.tracking_link_odds TO anon;

ALTER TABLE public.tracking_link_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracking_link_odds"
  ON public.tracking_link_odds FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert tracking_link_odds"
  ON public.tracking_link_odds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update tracking_link_odds"
  ON public.tracking_link_odds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete tracking_link_odds"
  ON public.tracking_link_odds FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tracking_link_odds_link ON public.tracking_link_odds(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_tracking_link_odds_platform ON public.tracking_link_odds(platform_id);

CREATE OR REPLACE FUNCTION public.tracking_link_odds_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_tracking_link_odds_touch ON public.tracking_link_odds;
CREATE TRIGGER trg_tracking_link_odds_touch BEFORE UPDATE ON public.tracking_link_odds
FOR EACH ROW EXECUTE FUNCTION public.tracking_link_odds_touch();
