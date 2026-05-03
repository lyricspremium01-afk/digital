
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product-files read all"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-files');

CREATE POLICY "product-files seller upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "product-files seller update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "product-files seller delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-files' AND auth.uid()::text = (storage.foldername(name))[1]);
