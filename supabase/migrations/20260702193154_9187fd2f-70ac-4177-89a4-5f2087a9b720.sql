ALTER TABLE public.platform_hyped_games
  DROP CONSTRAINT IF EXISTS platform_hyped_games_priority_check;

ALTER TABLE public.platform_hyped_games
  ADD CONSTRAINT platform_hyped_games_priority_check CHECK (priority BETWEEN 1 AND 20);