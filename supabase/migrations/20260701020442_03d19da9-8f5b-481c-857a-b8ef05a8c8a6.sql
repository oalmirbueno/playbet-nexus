-- Saques: link to manager (in addition to influencer)
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS saques_manager_id_idx ON public.saques(manager_id);

-- Manager profile: pix + optional promo link
ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS share_url text;

-- RLS: manager can see own saques
DROP POLICY IF EXISTS "Manager sees own saques" ON public.saques;
CREATE POLICY "Manager sees own saques"
ON public.saques FOR SELECT TO authenticated
USING (manager_id IS NOT NULL AND manager_id = public.current_manager_id());

-- RLS: manager can request own saques (no influencer_id)
DROP POLICY IF EXISTS "Manager requests own saques" ON public.saques;
CREATE POLICY "Manager requests own saques"
ON public.saques FOR INSERT TO authenticated
WITH CHECK (
  manager_id IS NOT NULL
  AND manager_id = public.current_manager_id()
  AND influencer_id IS NULL
);