-- ============================================================
-- SECURITY FIX: Remove overly permissive storage policies
-- ============================================================

-- DROP the three overly permissive policies that allow ANY authenticated user
-- to upload/modify/delete ANY file in the restaurant-logos bucket
DROP POLICY IF EXISTS "logos_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_authenticated" ON storage.objects;

-- The secure folder-based policies remain:
-- "Restaurant owners can upload to their folder"
-- "Restaurant owners can update their files"
-- "Restaurant owners can delete their files"
-- These policies verify restaurant ownership via EXISTS clause

-- ============================================================
-- SECURITY FIX: Remove confusing restaurant INSERT policy
-- ============================================================

-- DROP the overly permissive 'System can insert restaurants' policy
-- that allows any authenticated user to insert restaurants
DROP POLICY IF EXISTS "System can insert restaurants" ON public.restaurants;

-- Keep only the owner-based policy that restricts inserts to owner_id = auth.uid()
-- The 'restaurants_insert_owner' policy remains and provides proper access control