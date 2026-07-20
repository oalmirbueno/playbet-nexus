DROP POLICY IF EXISTS candidate_docs_insert ON storage.objects;
DROP POLICY IF EXISTS candidate_docs_update ON storage.objects;
DROP POLICY IF EXISTS candidate_docs_delete ON storage.objects;
DROP POLICY IF EXISTS candidate_docs_select ON storage.objects;

CREATE POLICY candidate_docs_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'candidate-documents');

CREATE POLICY candidate_docs_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'candidate-documents');

CREATE POLICY candidate_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'candidate-documents')
WITH CHECK (bucket_id = 'candidate-documents');

CREATE POLICY candidate_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'candidate-documents');