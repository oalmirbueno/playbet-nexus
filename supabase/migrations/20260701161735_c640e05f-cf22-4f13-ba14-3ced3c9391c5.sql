DROP INDEX IF EXISTS public.tracking_links_unique_active_variation_idx;
DROP INDEX IF EXISTS public.tracking_links_unique_active_idx;

CREATE INDEX IF NOT EXISTS tracking_links_active_lookup_idx
  ON public.tracking_links (influencer_id, platform_account_id, landing_page_id, game_slug, created_at DESC)
  WHERE status = 'active' AND is_demo = false;

CREATE INDEX IF NOT EXISTS tracking_links_created_at_idx
  ON public.tracking_links (created_at DESC)
  WHERE is_demo = false;