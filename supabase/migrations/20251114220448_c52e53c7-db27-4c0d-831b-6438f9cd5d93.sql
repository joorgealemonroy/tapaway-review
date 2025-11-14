-- ============================================================
-- Link Victor (bundle) and Amelia (standard) to their restaurants
-- This assumes auth users will be created when they sign up via /auth
-- ============================================================

-- Link Victor to his three Las Islas locations as bundle plan
-- Only updates if the auth user exists
UPDATE public.restaurants r
SET
  owner_id   = u.id,
  owner_name = 'Victor',
  plan_type  = 'bundle',
  subscription_status = 'active',
  updated_at = now()
FROM auth.users u
WHERE u.email = 'islasfbaproducts@gmail.com'
  AND r.custom_slug IN (
    'lasislassalem',
    'lasislaswoodburn',
    'lasislasportland'
  );

-- Create Las Nuevas Islas for Amelia if it doesn't exist and user exists
INSERT INTO public.restaurants (
  owner_id,
  restaurant_name,
  custom_slug,
  header_title,
  header_subtitle,
  menu_title,
  plan_type,
  subscription_status
)
SELECT
  u.id AS owner_id,
  'Las Nuevas Islas' AS restaurant_name,
  'lasnuevasislas' AS custom_slug,
  'How was your visit?' AS header_title,
  'Share your experience in seconds — your feedback helps us grow.' AS header_subtitle,
  'Our Menu' AS menu_title,
  'standard'::text AS plan_type,
  'active'::text AS subscription_status
FROM auth.users u
WHERE u.email = 'placeholder@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.custom_slug = 'lasnuevasislas'
  );

-- If Las Nuevas Islas already exists, link it to Amelia and set correct plan
UPDATE public.restaurants r
SET
  owner_id   = u.id,
  owner_name = 'Amelia',
  plan_type  = 'standard',
  subscription_status = 'active',
  updated_at = now()
FROM auth.users u
WHERE u.email = 'placeholder@gmail.com'
  AND r.custom_slug = 'lasnuevasislas';

-- Verification: Report what was linked
DO $$
DECLARE
  victor_count INTEGER;
  amelia_count INTEGER;
  victor_user_exists BOOLEAN;
  amelia_user_exists BOOLEAN;
BEGIN
  -- Check if auth users exist
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'islasfbaproducts@gmail.com') INTO victor_user_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'placeholder@gmail.com') INTO amelia_user_exists;
  
  -- Check Victor's locations
  SELECT COUNT(*) INTO victor_count
  FROM public.restaurants r
  WHERE r.custom_slug IN ('lasislassalem', 'lasislaswoodburn', 'lasislasportland')
    AND r.plan_type = 'bundle';
  
  -- Check Amelia's restaurant
  SELECT COUNT(*) INTO amelia_count
  FROM public.restaurants r
  WHERE r.custom_slug = 'lasnuevasislas';
  
  RAISE NOTICE 'Victor auth user exists: %', victor_user_exists;
  RAISE NOTICE 'Victor locations set to bundle: %', victor_count;
  RAISE NOTICE 'Amelia auth user exists: %', amelia_user_exists;
  RAISE NOTICE 'Amelia restaurant exists: %', (amelia_count > 0);
  
  IF NOT victor_user_exists THEN
    RAISE NOTICE 'Victor must sign up at /auth with email: islasfbaproducts@gmail.com';
  END IF;
  
  IF NOT amelia_user_exists THEN
    RAISE NOTICE 'Amelia must sign up at /auth with email: placeholder@gmail.com';
  END IF;
END $$;