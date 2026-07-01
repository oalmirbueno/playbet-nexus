
-- Extra fields for influencer profile (payment + contact)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS city text;

-- Link saques to the influencer
ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS saques_influencer_id_idx ON public.saques(influencer_id);

-- RLS for portal access on saques
DROP POLICY IF EXISTS "Influencer sees own saques" ON public.saques;
CREATE POLICY "Influencer sees own saques"
ON public.saques
FOR SELECT
TO authenticated
USING (
  influencer_id IS NOT NULL
  AND influencer_id = public.current_influencer_id()
);

DROP POLICY IF EXISTS "Influencer requests own saques" ON public.saques;
CREATE POLICY "Influencer requests own saques"
ON public.saques
FOR INSERT
TO authenticated
WITH CHECK (
  influencer_id IS NOT NULL
  AND influencer_id = public.current_influencer_id()
);

DROP POLICY IF EXISTS "Manager sees squad saques" ON public.saques;
CREATE POLICY "Manager sees squad saques"
ON public.saques
FOR SELECT
TO authenticated
USING (
  influencer_id IN (
    SELECT i.id FROM public.influencers i
    WHERE i.squad_id = public.current_manager_squad_id()
  )
);
