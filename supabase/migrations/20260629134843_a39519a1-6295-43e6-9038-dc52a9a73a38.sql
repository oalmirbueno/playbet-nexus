
-- Add career level fields aligned with PlayBet official model (v3)
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS career_level smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS career_label text;

ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS career_level smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS career_label text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric(6,2);

-- Validate level ranges
ALTER TABLE public.influencers DROP CONSTRAINT IF EXISTS influencers_career_level_chk;
ALTER TABLE public.influencers ADD CONSTRAINT influencers_career_level_chk CHECK (career_level BETWEEN 1 AND 5);

ALTER TABLE public.managers DROP CONSTRAINT IF EXISTS managers_career_level_chk;
ALTER TABLE public.managers ADD CONSTRAINT managers_career_level_chk CHECK (career_level BETWEEN 1 AND 5);
