
-- 1) Diretores
CREATE TABLE public.directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Diretor de Squads',
  color text NOT NULL DEFAULT '#6366F1',
  monthly_goal numeric,
  pix_key text,
  pix_key_type text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.directors TO authenticated;
GRANT ALL ON public.directors TO service_role;

ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage directors"
  ON public.directors FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read directors"
  ON public.directors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_directors_updated_at
  BEFORE UPDATE ON public.directors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Squads → diretor
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS director_id uuid REFERENCES public.directors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_squads_director_id ON public.squads(director_id);

-- 3) Managers → origem (influencer/sócio) + modo de remuneração
DO $$ BEGIN
  CREATE TYPE public.manager_origin_type AS ENUM ('influencer','socio','standalone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.manager_compensation_mode AS ENUM ('manager','socio_only','influencer_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS origin_type public.manager_origin_type NOT NULL DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS socio_id uuid REFERENCES public.socios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compensation_mode public.manager_compensation_mode NOT NULL DEFAULT 'manager';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_managers_influencer_id ON public.managers(influencer_id) WHERE influencer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_managers_socio_id ON public.managers(socio_id) WHERE socio_id IS NOT NULL;

-- 4) Guarda-corpo: se o gerente é um sócio, força compensation_mode = socio_only.
--    Se é influenciador, mantém 'manager' salvo escolha explícita. Consistência origin_type vs FKs.
CREATE OR REPLACE FUNCTION public.enforce_manager_origin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.socio_id IS NOT NULL THEN
    NEW.origin_type := 'socio';
    NEW.compensation_mode := 'socio_only';
    NEW.influencer_id := NULL;
  ELSIF NEW.influencer_id IS NOT NULL THEN
    NEW.origin_type := 'influencer';
    IF NEW.compensation_mode = 'socio_only' THEN
      NEW.compensation_mode := 'manager';
    END IF;
  ELSE
    NEW.origin_type := 'standalone';
    IF NEW.compensation_mode = 'socio_only' THEN
      NEW.compensation_mode := 'manager';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_manager_origin ON public.managers;
CREATE TRIGGER trg_enforce_manager_origin
  BEFORE INSERT OR UPDATE OF influencer_id, socio_id, compensation_mode, origin_type
  ON public.managers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_manager_origin();
