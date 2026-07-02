ALTER TABLE public.tracking_events
  DROP CONSTRAINT IF EXISTS tracking_events_tracking_link_id_fkey;

ALTER TABLE public.tracking_events
  ADD CONSTRAINT tracking_events_tracking_link_id_fkey
  FOREIGN KEY (tracking_link_id)
  REFERENCES public.tracking_links(id)
  ON DELETE SET NULL;