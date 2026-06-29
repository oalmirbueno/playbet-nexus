ALTER TABLE public.tracking_links
  ADD COLUMN IF NOT EXISTS use_lp boolean NOT NULL DEFAULT true;

-- Backfill: links with an instance/LP are "Com LP", the rest are "Sem LP".
UPDATE public.tracking_links
   SET use_lp = (landing_page_instance_id IS NOT NULL OR landing_page_id IS NOT NULL);