CREATE POLICY "candidate_docs_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'candidate-documents' AND (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operacao') OR public.has_role(auth.uid(), 'socio') OR public.has_role(auth.uid(), 'financeiro')));

CREATE POLICY "candidate_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'candidate-documents' AND (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operacao')));

CREATE POLICY "candidate_docs_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'candidate-documents' AND (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operacao')));

CREATE POLICY "candidate_docs_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'candidate-documents' AND (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'operacao')));