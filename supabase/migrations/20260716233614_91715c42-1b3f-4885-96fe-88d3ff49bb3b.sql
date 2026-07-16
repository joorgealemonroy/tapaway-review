
DROP POLICY IF EXISTS "Reps upload to own folder (restaurant-logos)" ON storage.objects;
DROP POLICY IF EXISTS "Reps update own folder (restaurant-logos)" ON storage.objects;
DROP POLICY IF EXISTS "Reps delete own folder (restaurant-logos)" ON storage.objects;

CREATE POLICY "Reps upload to own folder (restaurant-logos)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (public.is_sales_rep() OR public.is_admin())
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Reps update own folder (restaurant-logos)"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Reps delete own folder (restaurant-logos)"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
);
