-- Squads table
CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  manager_id uuid,
  monthly_goal numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read squads" ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage squads" ON public.squads FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add squad_id to influencers and managers
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL;
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL;

-- FK for squads.manager_id (after column exists)
ALTER TABLE public.squads ADD CONSTRAINT squads_manager_fk FOREIGN KEY (manager_id) REFERENCES public.managers(id) ON DELETE SET NULL;

-- Domains array on platforms for URL auto-detection
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS platforms_domains_gin ON public.platforms USING gin(domains);