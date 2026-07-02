
-- 1. landing_page_instances: novos campos
ALTER TABLE public.landing_page_instances
  ADD COLUMN IF NOT EXISTS lp_mode text NOT NULL DEFAULT 'catalog'
    CHECK (lp_mode IN ('single_game','multi_game','odds','catalog')),
  ADD COLUMN IF NOT EXISTS game_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS game_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hype_copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_tracking_link_id uuid REFERENCES public.tracking_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- 2. tracking_links: marcador auto-gerado
ALTER TABLE public.tracking_links
  ADD COLUMN IF NOT EXISTS lp_auto_generated boolean NOT NULL DEFAULT false;

-- 3. platform_material_rules
CREATE TABLE IF NOT EXISTS public.platform_material_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('feed','story','landscape','whatsapp')),
  style text NOT NULL CHECK (style IN ('hype_neon','minimal','editorial')),
  enabled boolean NOT NULL DEFAULT true,
  auto_on_new_link boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_id, format, style)
);

GRANT SELECT ON public.platform_material_rules TO authenticated;
GRANT ALL ON public.platform_material_rules TO service_role;

ALTER TABLE public.platform_material_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read material rules"
  ON public.platform_material_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin manage material rules"
  ON public.platform_material_rules FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_platform_material_rules_updated
  BEFORE UPDATE ON public.platform_material_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. link_materials
CREATE TABLE IF NOT EXISTS public.link_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id uuid NOT NULL REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  game_slug text,
  game_name text,
  format text NOT NULL,
  style text NOT NULL,
  image_url text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','rendering','ready','failed')),
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_materials_link ON public.link_materials(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_link_materials_influencer ON public.link_materials(influencer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_materials TO authenticated;
GRANT ALL ON public.link_materials TO service_role;

ALTER TABLE public.link_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage link_materials"
  ON public.link_materials FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "influencer reads own link_materials"
  ON public.link_materials FOR SELECT
  TO authenticated
  USING (influencer_id = public.current_influencer_id());

CREATE POLICY "manager reads own squad link_materials"
  ON public.link_materials FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = link_materials.influencer_id
      AND i.manager_id = public.current_manager_id()
  ));

CREATE TRIGGER trg_link_materials_updated
  BEFORE UPDATE ON public.link_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger que dispara autoconfigure + materials ao criar tracking_link
CREATE OR REPLACE FUNCTION public.trigger_link_autopipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_url text;
  _service_key text;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;

  -- Best-effort: enfileira via pg_net se disponível
  BEGIN
    _project_url := current_setting('app.settings.project_url', true);
    _service_key := current_setting('app.settings.service_key', true);
  EXCEPTION WHEN OTHERS THEN
    _project_url := NULL;
  END;

  -- Marca que o link precisa de LP+materiais (o front/edge poderá processar)
  INSERT INTO public.notifications (user_id, type, title, body, meta)
  SELECT p.id, 'link_pipeline_ready', 'Link pronto para LP e materiais',
         format('Link %s aguardando montagem de LP e materiais', NEW.tracking_code),
         jsonb_build_object('tracking_link_id', NEW.id)
  FROM public.profiles p
  WHERE p.influencer_id = NEW.influencer_id
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracking_links_autopipeline ON public.tracking_links;
CREATE TRIGGER trg_tracking_links_autopipeline
  AFTER INSERT ON public.tracking_links
  FOR EACH ROW EXECUTE FUNCTION public.trigger_link_autopipeline();
