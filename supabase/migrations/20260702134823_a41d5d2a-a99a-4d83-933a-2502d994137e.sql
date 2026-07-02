
-- 1) Tabela N:N gerente <-> squads
CREATE TABLE IF NOT EXISTS public.manager_squads (
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (manager_id, squad_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_squads TO authenticated;
GRANT ALL ON public.manager_squads TO service_role;

ALTER TABLE public.manager_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read manager_squads"
  ON public.manager_squads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage manager_squads"
  ON public.manager_squads FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Backfill: copia squad_id atual de cada manager para a nova tabela
INSERT INTO public.manager_squads (manager_id, squad_id)
SELECT id, squad_id FROM public.managers
WHERE squad_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2) Coluna hierarchy_role em managers (auto-recalculada)
DO $$ BEGIN
  CREATE TYPE public.manager_hierarchy_role AS ENUM ('gerente','gerente_diretor','diretor_squads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS hierarchy_role public.manager_hierarchy_role NOT NULL DEFAULT 'gerente';

CREATE OR REPLACE FUNCTION public.recalc_manager_hierarchy(_manager_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count int; _role public.manager_hierarchy_role;
BEGIN
  SELECT COUNT(*) INTO _count FROM public.manager_squads WHERE manager_id = _manager_id;
  _role := CASE
    WHEN _count >= 5 THEN 'diretor_squads'
    WHEN _count >= 3 THEN 'gerente_diretor'
    ELSE 'gerente'
  END;
  UPDATE public.managers SET hierarchy_role = _role, updated_at = now() WHERE id = _manager_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_manager_squads_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_manager_hierarchy(OLD.manager_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_manager_hierarchy(NEW.manager_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_manager_squads_recalc ON public.manager_squads;
CREATE TRIGGER trg_manager_squads_recalc
  AFTER INSERT OR DELETE ON public.manager_squads
  FOR EACH ROW EXECUTE FUNCTION public.trg_manager_squads_recalc();

-- Recalcula para os já existentes
DO $$
DECLARE _m uuid;
BEGIN
  FOR _m IN SELECT id FROM public.managers LOOP
    PERFORM public.recalc_manager_hierarchy(_m);
  END LOOP;
END $$;

-- 3) Pipeline cards: squad_ids[] para multi-squad em cards de gerente
ALTER TABLE public.commercial_pipeline_cards
  ADD COLUMN IF NOT EXISTS squad_ids uuid[] NOT NULL DEFAULT '{}';

-- 4) Autopromote: cria vínculos em manager_squads
CREATE OR REPLACE FUNCTION public.autopromote_pipeline_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug text;
  _new_id uuid;
  _role text;
  _sq uuid;
  _target_squads uuid[];
BEGIN
  IF NEW.stage <> 'concluido' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stage = 'concluido' THEN
    RETURN NEW;
  END IF;

  _role := COALESCE(NEW.role_type, 'influencer');
  _slug := regexp_replace(
    lower(translate(NEW.name, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                              'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '[^a-z0-9]+', '-', 'g'
  );
  _slug := trim(both '-' from _slug);
  IF _slug = '' OR _slug IS NULL THEN _slug := 'pessoa'; END IF;
  _slug := _slug || '-' || substr(md5(NEW.id::text), 1, 6);

  IF _role IN ('manager','gerente') THEN
    _target_squads := CASE
      WHEN array_length(NEW.squad_ids, 1) IS NOT NULL AND array_length(NEW.squad_ids, 1) > 0 THEN NEW.squad_ids
      WHEN NEW.squad_id IS NOT NULL THEN ARRAY[NEW.squad_id]
      ELSE '{}'::uuid[]
    END;

    IF NEW.generated_user_id IS NULL THEN
      INSERT INTO public.managers (name, slug, team_name, squad_id)
      VALUES (NEW.name, _slug, NEW.name, _target_squads[1])
      RETURNING id INTO _new_id;
      NEW.generated_user_id := _new_id;
    ELSE
      _new_id := NEW.generated_user_id;
      IF _target_squads <> '{}'::uuid[] THEN
        UPDATE public.managers SET squad_id = _target_squads[1], updated_at = now() WHERE id = _new_id;
      END IF;
    END IF;

    FOREACH _sq IN ARRAY _target_squads LOOP
      INSERT INTO public.manager_squads (manager_id, squad_id) VALUES (_new_id, _sq)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSE
    IF NEW.influencer_id IS NULL THEN
      INSERT INTO public.influencers (name, slug, manager_id, squad_id, category, is_active, notes)
      VALUES (NEW.name, _slug, NEW.manager_id, NEW.squad_id, COALESCE(NEW.niche, 'geral'), true, NEW.notes)
      RETURNING id INTO _new_id;
      NEW.influencer_id := _new_id;
    ELSE
      UPDATE public.influencers
      SET manager_id = COALESCE(NEW.manager_id, manager_id),
          squad_id = COALESCE(NEW.squad_id, squad_id),
          updated_at = now()
      WHERE id = NEW.influencer_id;
    END IF;
  END IF;

  IF NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autopromote_pipeline_card ON public.commercial_pipeline_cards;
CREATE TRIGGER trg_autopromote_pipeline_card
  BEFORE INSERT OR UPDATE OF stage ON public.commercial_pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION public.autopromote_pipeline_card();
