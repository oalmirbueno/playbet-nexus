DROP POLICY IF EXISTS "influencer updates own link_materials" ON public.link_materials;
DROP POLICY IF EXISTS "manager updates own squad link_materials" ON public.link_materials;
DROP POLICY IF EXISTS "influencer creates own link_materials" ON public.link_materials;
DROP POLICY IF EXISTS "manager creates own squad link_materials" ON public.link_materials;

CREATE POLICY "influencer updates own link_materials"
  ON public.link_materials FOR UPDATE
  TO authenticated
  USING (influencer_id = public.current_influencer_id())
  WITH CHECK (influencer_id = public.current_influencer_id());

CREATE POLICY "manager updates own squad link_materials"
  ON public.link_materials FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = link_materials.influencer_id
      AND i.manager_id = public.current_manager_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = link_materials.influencer_id
      AND i.manager_id = public.current_manager_id()
  ));

CREATE POLICY "influencer creates own link_materials"
  ON public.link_materials FOR INSERT
  TO authenticated
  WITH CHECK (influencer_id = public.current_influencer_id());

CREATE POLICY "manager creates own squad link_materials"
  ON public.link_materials FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = link_materials.influencer_id
      AND i.manager_id = public.current_manager_id()
  ));