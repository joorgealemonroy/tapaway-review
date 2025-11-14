-- ============================================================
-- Create Las Islas Marías restaurant for Sonia (semr13@me.com)
-- ============================================================

-- Insert the restaurant row for Sonia if it doesn't already exist
-- This assumes Sonia's user account already exists in auth.users
INSERT INTO public.restaurants (
  owner_id,
  restaurant_name,
  custom_slug,
  header_title,
  header_subtitle,
  menu_title,
  plan_type,
  subscription_status,
  slug_locked_at,
  created_at,
  updated_at
)
SELECT
  u.id as owner_id,
  'Las Islas Marías' as restaurant_name,
  'lasislasmarias' as custom_slug,
  'How was your visit?' as header_title,
  'Share your experience in seconds — your feedback helps us grow.' as header_subtitle,
  'Our Menu' as menu_title,
  'standard'::text as plan_type,
  'active'::text as subscription_status,
  now() as slug_locked_at,
  now() as created_at,
  now() as updated_at
FROM auth.users u
WHERE u.email = 'semr13@me.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.custom_slug = 'lasislasmarias'
  );


-- ============================================================
-- Fix logo upload RLS for authenticated owners
-- ============================================================

-- Ensure restaurant-logos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;


-- ============================================================
-- RLS for storage.objects (logo uploads)
-- ============================================================

-- Public can read logos (already exists, but ensure it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_public_select'
  ) THEN
    CREATE POLICY "logos_public_select"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'restaurant-logos');
  END IF;
END$$;

-- Authenticated users can insert logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_insert_authenticated'
  ) THEN
    CREATE POLICY "logos_insert_authenticated"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'restaurant-logos');
  END IF;
END$$;

-- Authenticated users can update logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_update_authenticated'
  ) THEN
    CREATE POLICY "logos_update_authenticated"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'restaurant-logos')
    WITH CHECK (bucket_id = 'restaurant-logos');
  END IF;
END$$;

-- Authenticated users can delete their logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_delete_authenticated'
  ) THEN
    CREATE POLICY "logos_delete_authenticated"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'restaurant-logos');
  END IF;
END$$;