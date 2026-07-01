
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_influencer_id ON public.profiles(influencer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

CREATE OR REPLACE FUNCTION public.current_influencer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT influencer_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_manager_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT manager_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_manager_squad_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.squad_id FROM public.managers m
  JOIN public.profiles p ON p.manager_id = m.id
  WHERE p.id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_influencer_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_manager_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_manager_squad_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_influencer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_manager_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_manager_squad_id() TO authenticated;

DROP POLICY IF EXISTS "Influencer sees own record" ON public.influencers;
CREATE POLICY "Influencer sees own record" ON public.influencers FOR SELECT TO authenticated
  USING (id = public.current_influencer_id());

DROP POLICY IF EXISTS "Manager sees squad influencers" ON public.influencers;
CREATE POLICY "Manager sees squad influencers" ON public.influencers FOR SELECT TO authenticated
  USING (
    manager_id = public.current_manager_id()
    OR squad_id = public.current_manager_squad_id()
  );

DROP POLICY IF EXISTS "Influencer sees own metrics" ON public.tracking_metrics;
CREATE POLICY "Influencer sees own metrics" ON public.tracking_metrics FOR SELECT TO authenticated
  USING (influencer_id = public.current_influencer_id());

DROP POLICY IF EXISTS "Manager sees squad metrics" ON public.tracking_metrics;
CREATE POLICY "Manager sees squad metrics" ON public.tracking_metrics FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = tracking_metrics.influencer_id
      AND (i.manager_id = public.current_manager_id() OR i.squad_id = public.current_manager_squad_id())
  ));

DROP POLICY IF EXISTS "Influencer sees own events" ON public.tracking_events;
CREATE POLICY "Influencer sees own events" ON public.tracking_events FOR SELECT TO authenticated
  USING (influencer_id = public.current_influencer_id());

DROP POLICY IF EXISTS "Manager sees squad events" ON public.tracking_events;
CREATE POLICY "Manager sees squad events" ON public.tracking_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = tracking_events.influencer_id
      AND (i.manager_id = public.current_manager_id() OR i.squad_id = public.current_manager_squad_id())
  ));

DROP POLICY IF EXISTS "Influencer sees own links" ON public.tracking_links;
CREATE POLICY "Influencer sees own links" ON public.tracking_links FOR SELECT TO authenticated
  USING (influencer_id = public.current_influencer_id());

DROP POLICY IF EXISTS "Manager sees squad links" ON public.tracking_links;
CREATE POLICY "Manager sees squad links" ON public.tracking_links FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.influencers i
    WHERE i.id = tracking_links.influencer_id
      AND (i.manager_id = public.current_manager_id() OR i.squad_id = public.current_manager_squad_id())
  ));

DROP POLICY IF EXISTS "Manager sees squad pipeline" ON public.commercial_pipeline_cards;
CREATE POLICY "Manager sees squad pipeline" ON public.commercial_pipeline_cards FOR SELECT TO authenticated
  USING (
    manager_id = public.current_manager_id()
    OR squad_id = public.current_manager_squad_id()
  );
