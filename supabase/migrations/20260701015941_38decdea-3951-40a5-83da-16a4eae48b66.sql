-- Allow managers to update their squad's tracking links (limited edits like status/notes)
CREATE POLICY "Manager can update squad links"
ON public.tracking_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = tracking_links.influencer_id
      AND (i.manager_id = public.current_manager_id() OR i.squad_id = public.current_manager_squad_id())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = tracking_links.influencer_id
      AND (i.manager_id = public.current_manager_id() OR i.squad_id = public.current_manager_squad_id())
  )
);