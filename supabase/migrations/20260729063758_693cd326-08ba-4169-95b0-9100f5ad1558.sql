
DROP POLICY IF EXISTS "card-print-files owners and admins select" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins insert" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins update" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins delete" ON storage.objects;

CREATE POLICY "card-print-files owners and admins select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.id::text = split_part(name, '/', 1)
        AND (p.user_id = auth.uid() OR p.created_by_rep_id = auth.uid())
    )
  )
);

CREATE POLICY "card-print-files owners and admins insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'card-print-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.id::text = split_part(name, '/', 1)
        AND (p.user_id = auth.uid() OR p.created_by_rep_id = auth.uid())
    )
  )
);

CREATE POLICY "card-print-files owners and admins update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.id::text = split_part(name, '/', 1)
        AND (p.user_id = auth.uid() OR p.created_by_rep_id = auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'card-print-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.id::text = split_part(name, '/', 1)
        AND (p.user_id = auth.uid() OR p.created_by_rep_id = auth.uid())
    )
  )
);

CREATE POLICY "card-print-files owners and admins delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.id::text = split_part(name, '/', 1)
        AND (p.user_id = auth.uid() OR p.created_by_rep_id = auth.uid())
    )
  )
);
