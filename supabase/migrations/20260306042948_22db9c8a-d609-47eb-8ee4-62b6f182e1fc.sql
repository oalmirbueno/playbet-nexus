
-- Add PERMISSIVE policies for public access to influencers (read active only by slug)
CREATE POLICY "Public can read active influencers"
ON public.influencers
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Add PERMISSIVE policy for public click inserts
CREATE POLICY "Anyone can insert clicks with influencer"
ON public.clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (influencer_id IS NOT NULL);

-- Add PERMISSIVE read policy for authenticated clicks
CREATE POLICY "Authenticated can view clicks"
ON public.clicks
FOR SELECT
TO authenticated
USING (true);
