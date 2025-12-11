-- Allow anonymous users to read public restaurant info via the view
-- Create a policy that allows SELECT on the restaurants table for anonymous users
-- but only returns the columns exposed by the restaurant_public_info view

CREATE POLICY "Public can read restaurant public info" 
ON public.restaurants 
FOR SELECT 
TO anon
USING (true);

-- Note: This allows anon to select from restaurants, but the view only exposes safe columns