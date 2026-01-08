-- Allow admins to upload to personal-photos storage bucket
CREATE POLICY "Admins can upload any personal photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'personal-photos' AND is_admin()
);

CREATE POLICY "Admins can update any personal photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'personal-photos' AND is_admin()
)
WITH CHECK (
  bucket_id = 'personal-photos' AND is_admin()
);

-- Allow admins to manage personal_blocks
CREATE POLICY "Admins can manage all personal blocks"
ON personal_blocks FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow admins to manage personal_links (in case it's missing)
CREATE POLICY "Admins can manage all personal links"
ON personal_links FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow admins to manage personal_profiles
CREATE POLICY "Admins can manage all personal profiles"
ON personal_profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());