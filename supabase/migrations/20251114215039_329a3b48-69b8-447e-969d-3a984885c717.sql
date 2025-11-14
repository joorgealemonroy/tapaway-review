-- ============================================================
-- Link Las Islas Marías restaurant to Sonia (semr13@me.com)
-- ============================================================

-- Update the restaurant row to link it to Sonia's auth user
-- This assumes Sonia's auth.users account exists
UPDATE public.restaurants
SET 
  owner_id = u.id,
  owner_name = 'Sonia',
  updated_at = now()
FROM auth.users u
WHERE u.email = 'semr13@me.com'
  AND restaurants.custom_slug = 'lasislasmarias'
  AND (restaurants.owner_id IS NULL OR restaurants.owner_id != u.id);

-- Verify the link was created (this will error if user doesn't exist)
DO $$
DECLARE
  restaurant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO restaurant_count
  FROM public.restaurants r
  JOIN auth.users u ON r.owner_id = u.id
  WHERE r.custom_slug = 'lasislasmarias'
    AND u.email = 'semr13@me.com';
  
  IF restaurant_count = 0 THEN
    RAISE NOTICE 'Restaurant lasislasmarias exists but is not yet linked to semr13@me.com - user may need to be created first';
  ELSE
    RAISE NOTICE 'Restaurant lasislasmarias successfully linked to Sonia (semr13@me.com)';
  END IF;
END $$;