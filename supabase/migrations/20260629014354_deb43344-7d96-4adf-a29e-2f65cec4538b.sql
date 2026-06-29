
-- 1) managers table
CREATE TABLE public.managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  team_name text NOT NULL,
  team_color text NOT NULL DEFAULT '#3B82F6',
  monthly_goal numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.managers TO authenticated;
GRANT ALL ON public.managers TO service_role;

ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read managers" ON public.managers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can write managers" ON public.managers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_managers_updated_at
  BEFORE UPDATE ON public.managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) influencers gains manager_id + team_label cache
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_label text;

CREATE INDEX IF NOT EXISTS idx_influencers_manager_id ON public.influencers(manager_id);
