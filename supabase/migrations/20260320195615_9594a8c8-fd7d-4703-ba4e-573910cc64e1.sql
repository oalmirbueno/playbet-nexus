-- Remove the unique constraint that prevents same influencer on same LP
ALTER TABLE public.landing_page_instances
  DROP CONSTRAINT landing_page_instances_landing_page_id_influencer_id_key;