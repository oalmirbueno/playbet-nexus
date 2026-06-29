CREATE TABLE public.lp_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id uuid NULL REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  tracking_link_id uuid NULL REFERENCES public.tracking_links(id) ON DELETE SET NULL,
  platform_id uuid NULL REFERENCES public.platforms(id) ON DELETE SET NULL,
  campanha_id uuid NULL REFERENCES public.campanhas(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text NULL,
  category text NOT NULL DEFAULT 'sports',
  event_name text NULL,
  market_name text NULL,
  odd_label text NULL,
  badge text NULL,
  cta_label text NOT NULL DEFAULT 'Ver oportunidade',
  destination_url text NOT NULL,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lp_opportunities_landing_page ON public.lp_opportunities(landing_page_id);
CREATE INDEX idx_lp_opportunities_active ON public.lp_opportunities(is_active, sort_order);
CREATE INDEX idx_lp_opportunities_category ON public.lp_opportunities(category);

GRANT SELECT ON public.lp_opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lp_opportunities TO authenticated;
GRANT ALL ON public.lp_opportunities TO service_role;

ALTER TABLE public.lp_opportunities ENABLE ROW LEVEL SECURITY;

-- Public read: only active rows within optional window
CREATE POLICY "Public can read active opportunities in window"
ON public.lp_opportunities
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

-- Authenticated admins can read everything (overrides above for staff)
CREATE POLICY "Admins read all opportunities"
ON public.lp_opportunities
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert opportunities"
ON public.lp_opportunities
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update opportunities"
ON public.lp_opportunities
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete opportunities"
ON public.lp_opportunities
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_lp_opportunities_updated_at
BEFORE UPDATE ON public.lp_opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();