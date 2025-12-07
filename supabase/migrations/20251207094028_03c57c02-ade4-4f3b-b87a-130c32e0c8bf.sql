-- Drop the overly permissive policy that allows any authenticated user to access all restaurants
DROP POLICY IF EXISTS "Require authentication for all access" ON public.restaurants;

-- The remaining policies correctly restrict access:
-- - Owners can view/update their own restaurants (auth.uid() = owner_id)
-- - Admins can view/update/delete all restaurants (has_role check)
-- - super_admin_restaurants for tap@tapaway.co