ALTER TABLE public.landing_page_instances
  DROP CONSTRAINT IF EXISTS landing_page_instances_lp_mode_check;

ALTER TABLE public.landing_page_instances
  ADD CONSTRAINT landing_page_instances_lp_mode_check
  CHECK (lp_mode = ANY (ARRAY['single_game'::text, 'multi_game'::text, 'odds'::text, 'catalog'::text, 'platform_direct'::text]));