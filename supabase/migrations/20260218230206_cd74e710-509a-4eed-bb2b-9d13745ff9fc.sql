DROP POLICY IF EXISTS "Authenticated users can upload link images" ON storage.objects;

CREATE POLICY "Anyone can upload link images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'personal-link-images');