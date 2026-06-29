
-- ============ lp_events ============
CREATE TABLE public.lp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL DEFAULT 'futebol',
  league text,
  home_team text NOT NULL,
  away_team text NOT NULL,
  starts_at timestamptz,
  home_team_logo_url text,
  away_team_logo_url text,
  event_image_url text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','casa','api','sala_sinais')),
  external_ref text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lp_events TO authenticated;
GRANT SELECT ON public.lp_events TO anon;
GRANT ALL ON public.lp_events TO service_role;

ALTER TABLE public.lp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage events" ON public.lp_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public read active events" ON public.lp_events
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE INDEX idx_lp_events_starts_at ON public.lp_events (starts_at DESC);
CREATE INDEX idx_lp_events_active ON public.lp_events (is_active);
CREATE INDEX idx_lp_events_sport ON public.lp_events (sport);

CREATE TRIGGER update_lp_events_updated_at
  BEFORE UPDATE ON public.lp_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ lp_signals (sala de sinais) ============
CREATE TABLE public.lp_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  source_name text,
  source_channel text NOT NULL DEFAULT 'manual' CHECK (source_channel IN ('manual','telegram','whatsapp','grupo','api','outro')),
  external_id text,
  event_id uuid REFERENCES public.lp_events(id) ON DELETE SET NULL,
  platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  market_type text,
  market_name text,
  odd_label text,
  confidence text NOT NULL DEFAULT 'media' CHECK (confidence IN ('baixa','media','alta')),
  house_url text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','rascunho','publicado','descartado')),
  draft_opportunity_id uuid REFERENCES public.lp_opportunities(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lp_signals TO authenticated;
GRANT ALL ON public.lp_signals TO service_role;

ALTER TABLE public.lp_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signals" ON public.lp_signals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_lp_signals_status ON public.lp_signals (status, received_at DESC);
CREATE INDEX idx_lp_signals_event ON public.lp_signals (event_id);
CREATE UNIQUE INDEX uq_lp_signals_channel_external
  ON public.lp_signals (source_channel, external_id)
  WHERE external_id IS NOT NULL;

CREATE TRIGGER update_lp_signals_updated_at
  BEFORE UPDATE ON public.lp_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Extensão de lp_opportunities ============
ALTER TABLE public.lp_opportunities
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.lp_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS market_type text,
  ADD COLUMN IF NOT EXISTS signal_id uuid REFERENCES public.lp_signals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signal_source text,
  ADD COLUMN IF NOT EXISTS signal_confidence text CHECK (signal_confidence IN ('baixa','media','alta')),
  ADD COLUMN IF NOT EXISTS stats_summary text,
  ADD COLUMN IF NOT EXISTS recommendation_score integer CHECK (recommendation_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS recommendation_reason text,
  ADD COLUMN IF NOT EXISTS home_team_logo_url text,
  ADD COLUMN IF NOT EXISTS away_team_logo_url text,
  ADD COLUMN IF NOT EXISTS event_image_url text,
  ADD COLUMN IF NOT EXISTS game_thumb_url text,
  ADD COLUMN IF NOT EXISTS provider_logo_url text;

CREATE INDEX IF NOT EXISTS idx_lp_opportunities_event ON public.lp_opportunities (event_id);
CREATE INDEX IF NOT EXISTS idx_lp_opportunities_market_type ON public.lp_opportunities (market_type);
