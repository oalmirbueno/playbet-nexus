
-- Bucket path convention: `{auth.uid()}/{filename}`
DROP POLICY IF EXISTS "nf_read_own" ON storage.objects;
CREATE POLICY "nf_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-fiscais'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "nf_insert_own" ON storage.objects;
CREATE POLICY "nf_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notas-fiscais'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "nf_update_own" ON storage.objects;
CREATE POLICY "nf_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "nf_delete_own_or_admin" ON storage.objects;
CREATE POLICY "nf_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'notas-fiscais'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );
