-- Fix security issues

-- 1. Restrict analytics insertion to authenticated users only
DROP POLICY IF EXISTS "Public can insert analytics events" ON analytics_events;
CREATE POLICY "Authenticated users can insert analytics" 
  ON analytics_events FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Add DELETE policy for restaurants (admin-only)
CREATE POLICY "Admins can delete restaurants"
  ON restaurants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create server-side function for test account check
CREATE OR REPLACE FUNCTION public.is_test_account()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'test@me.com'
  )
$$;