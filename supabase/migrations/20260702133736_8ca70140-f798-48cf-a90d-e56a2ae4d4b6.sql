
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

  IF _role = 'manager' THEN
    -- Cria gerente autônomo (standalone) se não estiver vinculado
    IF NEW.generated_user_id IS NULL THEN
      INSERT INTO public.managers (name, slug, team_name, squad_id)
      VALUES (NEW.name, _slug, NEW.name, NEW.squad_id)
      RETURNING id INTO _new_id;
      NEW.generated_user_id := _new_id;
    ELSE
      UPDATE public.managers SET squad_id = NEW.squad_id, updated_at = now()
      WHERE id = NEW.generated_user_id;
    END IF;
  ELSE
    -- Influenciador (padrão)
    IF NEW.influencer_id IS NULL THEN
      INSERT INTO public.influencers (name, slug, manager_id, squad_id, category, is_active, notes)
      VALUES (
        NEW.name, _slug, NEW.manager_id, NEW.squad_id,
        COALESCE(NEW.niche, 'geral'), true,
        NEW.notes
      )
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
