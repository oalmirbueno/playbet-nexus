CREATE INDEX IF NOT EXISTS idx_landing_pages_active_domain
ON public.landing_pages (is_active, domain);

CREATE INDEX IF NOT EXISTS idx_landing_page_instances_active_slug
ON public.landing_page_instances (is_active, slug);

CREATE INDEX IF NOT EXISTS idx_tracking_links_lpi_updated
ON public.tracking_links (landing_page_instance_id, updated_at DESC)
WHERE is_demo = false;

CREATE INDEX IF NOT EXISTS idx_tracking_links_influencer_updated
ON public.tracking_links (influencer_id, updated_at DESC)
WHERE is_demo = false;

CREATE INDEX IF NOT EXISTS idx_lp_opportunities_tracking_active_updated
ON public.lp_opportunities (tracking_link_id, is_active, updated_at DESC)
WHERE destination_url IS NOT NULL;