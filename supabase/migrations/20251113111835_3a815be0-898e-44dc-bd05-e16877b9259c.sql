-- Create storage bucket for restaurant logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-logos',
  'restaurant-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for restaurant logos
CREATE POLICY "Public can view restaurant logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'restaurant-logos');

CREATE POLICY "Authenticated users can upload their restaurant logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Restaurant owners can update their logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Restaurant owners can delete their logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);