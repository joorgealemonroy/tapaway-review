-- Fix menu image upload RLS policy on storage.objects
-- Root cause: Old policy checked if folder name = auth.uid(), but code uploads to folder = restaurantId
-- Solution: Verify folder name matches a restaurant ID owned by the current user

-- Drop existing policies that were causing the RLS violation
DROP POLICY IF EXISTS "Authenticated users can upload their restaurant logos" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete their logos" ON storage.objects;

-- Create new policy for INSERT that checks restaurant ownership
CREATE POLICY "Restaurant owners can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-logos' AND
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
  )
);

-- Create new policy for UPDATE that checks restaurant ownership
CREATE POLICY "Restaurant owners can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-logos' AND
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
  )
);

-- Create new policy for DELETE that checks restaurant ownership
CREATE POLICY "Restaurant owners can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-logos' AND
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
  )
);

-- Keep the existing SELECT policy for public access to logo images
-- (This should already exist, not modifying it)