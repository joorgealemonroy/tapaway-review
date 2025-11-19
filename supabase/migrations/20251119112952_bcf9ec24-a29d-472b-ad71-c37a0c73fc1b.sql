-- Fix overpermissive storage bucket policies
DROP POLICY IF EXISTS "logos_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_authenticated" ON storage.objects;

-- Add unique constraint to custom_slug to prevent race conditions
-- Use partial unique index to allow NULL values
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_custom_slug_unique_idx 
ON public.restaurants (custom_slug) 
WHERE custom_slug IS NOT NULL;