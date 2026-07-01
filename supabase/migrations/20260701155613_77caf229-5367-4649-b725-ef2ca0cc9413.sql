-- 1) Platforms: add domain patterns and icon base URL
ALTER TABLE public.platforms
  ADD COLUMN IF NOT EXISTS domain_patterns text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS icon_base_url text;

-- 2) tracking_links: enrich with game / category / hype context
ALTER TABLE public.tracking_links
  ADD COLUMN IF NOT EXISTS game_slug text,
  ADD COLUMN IF NOT EXISTS game_name text,
  ADD COLUMN IF NOT EXISTS game_icon_url text,
  ADD COLUMN IF NOT EXISTS link_category text,
  ADD COLUMN IF NOT EXISTS hype_reason text,
  ADD COLUMN IF NOT EXISTS parent_link_id uuid REFERENCES public.tracking_links(id) ON DELETE SET NULL;

-- Relax duplicate index to allow variations per game
DROP INDEX IF EXISTS public.tracking_links_unique_active_idx;
CREATE UNIQUE INDEX IF NOT EXISTS tracking_links_unique_active_variation_idx
  ON public.tracking_links (
    influencer_id,
    COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(landing_page_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(game_slug, '')
  )
  WHERE status = 'active' AND is_demo = false;

-- 3) platform_hyped_games — LLM-refreshed hot games per platform
CREATE TABLE IF NOT EXISTS public.platform_hyped_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  game_name text NOT NULL,
  game_slug text NOT NULL,
  icon_url text,
  category text,
  hype_reason text,
  priority int NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  hype_score numeric,
  is_active boolean NOT NULL DEFAULT true,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_id, game_slug)
);

GRANT SELECT ON public.platform_hyped_games TO authenticated;
GRANT ALL ON public.platform_hyped_games TO service_role;

ALTER TABLE public.platform_hyped_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read hyped games"
  ON public.platform_hyped_games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage hyped games"
  ON public.platform_hyped_games FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_platform_hyped_games_updated_at
  BEFORE UPDATE ON public.platform_hyped_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Notify influencer + manager when a new tracking_link is created
CREATE OR REPLACE FUNCTION public.notify_new_tracking_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _platform_name text;
  _manager_id uuid;
  _game_label text;
  _reason text;
  _body text;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;
  IF NEW.influencer_id IS NULL THEN RETURN NEW; END IF;

  SELECT p.name INTO _platform_name
  FROM public.platform_accounts pa
  JOIN public.platforms p ON p.id = pa.platform_id
  WHERE pa.id = NEW.platform_account_id;

  SELECT manager_id INTO _manager_id
  FROM public.influencers WHERE id = NEW.influencer_id;

  _game_label := COALESCE(NEW.game_name, NEW.link_category, 'novo link');
  _reason := COALESCE(NEW.hype_reason, '');
  _body := format('Novo link pronto: %s%s%s',
    _game_label,
    CASE WHEN _platform_name IS NOT NULL THEN ' · ' || _platform_name ELSE '' END,
    CASE WHEN _reason <> '' THEN ' — ' || _reason ELSE '' END
  );

  PERFORM public.notify_target(
    'influencer', NEW.influencer_id,
    'new_tracking_link', 'Novo link de afiliado', _body,
    '/portal/links',
    jsonb_build_object(
      'tracking_link_id', NEW.id,
      'game_slug', NEW.game_slug,
      'game_name', NEW.game_name,
      'icon_url', NEW.game_icon_url,
      'category', NEW.link_category,
      'hype_reason', NEW.hype_reason
    )
  );

  IF _manager_id IS NOT NULL THEN
    PERFORM public.notify_target(
      'manager', _manager_id,
      'new_tracking_link', 'Link criado para influenciador', _body,
      '/gerente/links',
      jsonb_build_object(
        'tracking_link_id', NEW.id,
        'influencer_id', NEW.influencer_id,
        'game_slug', NEW.game_slug,
        'game_name', NEW.game_name,
        'icon_url', NEW.game_icon_url,
        'category', NEW.link_category,
        'hype_reason', NEW.hype_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_tracking_link ON public.tracking_links;
CREATE TRIGGER trg_notify_new_tracking_link
  AFTER INSERT ON public.tracking_links
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_tracking_link();