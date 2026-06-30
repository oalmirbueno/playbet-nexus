
-- ============================================================
-- COMERCIAL: pipeline kanban, checklist, distribuição
-- ============================================================

-- Enum de estágios do pipeline
DO $$ BEGIN
  CREATE TYPE public.commercial_stage AS ENUM (
    'em_contato','respondeu','checklist','cadastro','analise','aprovado','concluido'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum de tipos de item de checklist
DO $$ BEGIN
  CREATE TYPE public.commercial_checklist_field_type AS ENUM (
    'boolean','text','number','link','file','select'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- Templates de checklist (versionados)
-- ------------------------------------------------------------
CREATE TABLE public.commercial_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  min_required_pct int NOT NULL DEFAULT 80,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_checklist_templates TO authenticated;
GRANT ALL ON public.commercial_checklist_templates TO service_role;
ALTER TABLE public.commercial_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read templates" ON public.commercial_checklist_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage templates" ON public.commercial_checklist_templates
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.commercial_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens de cada template
CREATE TABLE public.commercial_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.commercial_checklist_templates(id) ON DELETE CASCADE,
  group_label text NOT NULL,
  label text NOT NULL,
  field_type public.commercial_checklist_field_type NOT NULL DEFAULT 'boolean',
  required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_checklist_items TO authenticated;
GRANT ALL ON public.commercial_checklist_items TO service_role;
ALTER TABLE public.commercial_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read items" ON public.commercial_checklist_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage items" ON public.commercial_checklist_items
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- Cards do pipeline
-- ------------------------------------------------------------
CREATE TABLE public.commercial_pipeline_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage public.commercial_stage NOT NULL DEFAULT 'em_contato',
  position int NOT NULL DEFAULT 0,

  -- identidade do candidato
  name text NOT NULL,
  handle text,
  primary_channel text,
  source text,
  niche text,
  tags text[] DEFAULT '{}',

  -- contato
  email text,
  phone text,
  city text,
  uf text,
  document text,

  -- dados ricos (preenchidos no estágio cadastro)
  social_profiles jsonb DEFAULT '{}'::jsonb,
  content_info jsonb DEFAULT '{}'::jsonb,
  financial_info jsonb DEFAULT '{}'::jsonb,
  documents jsonb DEFAULT '{}'::jsonb,

  -- atribuições
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.commercial_checklist_templates(id) ON DELETE SET NULL,

  -- timestamps de fluxo
  responded_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  stage_moved_at timestamptz NOT NULL DEFAULT now(),

  -- progresso
  checklist_progress int NOT NULL DEFAULT 0,

  -- responsáveis
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  notes text,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_stage ON public.commercial_pipeline_cards(stage, position);
CREATE INDEX idx_pipeline_squad ON public.commercial_pipeline_cards(squad_id);
CREATE INDEX idx_pipeline_manager ON public.commercial_pipeline_cards(manager_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_pipeline_cards TO authenticated;
GRANT ALL ON public.commercial_pipeline_cards TO service_role;
ALTER TABLE public.commercial_pipeline_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full pipeline" ON public.commercial_pipeline_cards
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "owner sees own card" ON public.commercial_pipeline_cards
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE TRIGGER trg_pipeline_updated BEFORE UPDATE ON public.commercial_pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Respostas de checklist por card
-- ------------------------------------------------------------
CREATE TABLE public.commercial_card_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.commercial_pipeline_cards(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.commercial_checklist_items(id) ON DELETE CASCADE,
  checked boolean NOT NULL DEFAULT false,
  value_text text,
  value_number numeric,
  checked_at timestamptz,
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_card_checklist TO authenticated;
GRANT ALL ON public.commercial_card_checklist TO service_role;
ALTER TABLE public.commercial_card_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage card checklist" ON public.commercial_card_checklist
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_card_checklist_updated BEFORE UPDATE ON public.commercial_card_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Histórico de movimentações
-- ------------------------------------------------------------
CREATE TABLE public.commercial_card_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.commercial_pipeline_cards(id) ON DELETE CASCADE,
  from_stage public.commercial_stage,
  to_stage public.commercial_stage NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_history_card ON public.commercial_card_history(card_id, created_at DESC);
GRANT SELECT, INSERT ON public.commercial_card_history TO authenticated;
GRANT ALL ON public.commercial_card_history TO service_role;
ALTER TABLE public.commercial_card_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read history" ON public.commercial_card_history
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin insert history" ON public.commercial_card_history
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- Round-robin: escolhe gerente do squad com menor carga
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pick_manager_for_squad(_squad_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.managers m
  LEFT JOIN public.influencers i
    ON i.manager_id = m.id AND i.is_active = true
  WHERE m.squad_id = _squad_id AND m.is_active = true
  GROUP BY m.id
  ORDER BY COUNT(i.id) ASC, m.created_at ASC
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- Trigger: ao mover stage, registra histórico e automações
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_pipeline_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tpl uuid;
  _picked uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage = OLD.stage THEN
    RETURN NEW;
  END IF;

  NEW.stage_moved_at := now();

  -- Respondeu: marca data
  IF NEW.stage = 'respondeu' AND NEW.responded_at IS NULL THEN
    NEW.responded_at := now();
  END IF;

  -- Checklist: anexa template ativo se nenhum
  IF NEW.stage = 'checklist' AND NEW.template_id IS NULL THEN
    SELECT id INTO _tpl
    FROM public.commercial_checklist_templates
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;
    NEW.template_id := _tpl;
  END IF;

  -- Aprovado: distribui automaticamente se squad escolhido e sem gerente
  IF NEW.stage = 'aprovado' THEN
    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
    IF NEW.squad_id IS NOT NULL AND NEW.manager_id IS NULL THEN
      SELECT public.pick_manager_for_squad(NEW.squad_id) INTO _picked;
      NEW.manager_id := _picked;
    END IF;
  END IF;

  -- Concluído: timestamp
  IF NEW.stage = 'concluido' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pipeline_stage_change
  BEFORE UPDATE OF stage ON public.commercial_pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_pipeline_stage_change();

CREATE OR REPLACE FUNCTION public.log_pipeline_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.commercial_card_history (card_id, from_stage, to_stage, actor_user_id)
    VALUES (NEW.id, NULL, NEW.stage, auth.uid());
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.commercial_card_history (card_id, from_stage, to_stage, actor_user_id)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pipeline_history_ins
  AFTER INSERT ON public.commercial_pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_pipeline_history();

CREATE TRIGGER trg_pipeline_history_upd
  AFTER UPDATE OF stage ON public.commercial_pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_pipeline_history();

-- ------------------------------------------------------------
-- Template padrão semeado
-- ------------------------------------------------------------
DO $seed$
DECLARE _tpl uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.commercial_checklist_templates) THEN
    INSERT INTO public.commercial_checklist_templates (name, version, is_active, min_required_pct, notes)
    VALUES ('Qualificação padrão', 1, true, 80, 'Template inicial de qualificação de afiliados')
    RETURNING id INTO _tpl;

    INSERT INTO public.commercial_checklist_items (template_id, group_label, label, field_type, required, position) VALUES
      (_tpl,'Dados básicos','Nome completo','text',true,1),
      (_tpl,'Dados básicos','CPF ou CNPJ','text',true,2),
      (_tpl,'Dados básicos','E-mail','text',true,3),
      (_tpl,'Dados básicos','WhatsApp','text',true,4),
      (_tpl,'Dados básicos','Cidade / UF','text',true,5),

      (_tpl,'Redes e audiência','Instagram (handle)','text',false,10),
      (_tpl,'Redes e audiência','Instagram (seguidores)','number',false,11),
      (_tpl,'Redes e audiência','TikTok (handle)','text',false,12),
      (_tpl,'Redes e audiência','TikTok (seguidores)','number',false,13),
      (_tpl,'Redes e audiência','YouTube (handle)','text',false,14),
      (_tpl,'Redes e audiência','Telegram (handle)','text',false,15),
      (_tpl,'Redes e audiência','Kwai (handle)','text',false,16),
      (_tpl,'Redes e audiência','Engajamento médio (%)','number',false,17),

      (_tpl,'Conteúdo e nicho','Nicho principal','text',true,20),
      (_tpl,'Conteúdo e nicho','Tipo de conteúdo','text',true,21),
      (_tpl,'Conteúdo e nicho','Frequência de posts','text',false,22),
      (_tpl,'Conteúdo e nicho','Link de exemplo de post','link',false,23),

      (_tpl,'Comercial e financeiro','Modelo de remuneração','text',true,30),
      (_tpl,'Comercial e financeiro','Histórico com outras casas','text',false,31),
      (_tpl,'Comercial e financeiro','Chave PIX / conta Asaas','text',true,32),
      (_tpl,'Comercial e financeiro','Contrato assinado','boolean',true,33);
  END IF;
END $seed$;
