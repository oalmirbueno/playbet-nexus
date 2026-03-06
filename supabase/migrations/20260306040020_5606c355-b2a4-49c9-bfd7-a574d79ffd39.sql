
-- Fix: make clicks insert policy more restrictive (only allow insert, not other ops, for anon)
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.clicks;
CREATE POLICY "Public can insert clicks" ON public.clicks
  FOR INSERT TO anon WITH CHECK (
    influencer_id IS NOT NULL
  );
CREATE POLICY "Authenticated can insert clicks" ON public.clicks
  FOR INSERT TO authenticated WITH CHECK (true);
