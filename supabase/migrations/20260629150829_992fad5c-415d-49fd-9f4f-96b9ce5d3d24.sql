ALTER TABLE public.influencers
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'influencer'
CHECK (category IN ('influencer', 'streamer'));

CREATE INDEX IF NOT EXISTS idx_influencers_category ON public.influencers(category);