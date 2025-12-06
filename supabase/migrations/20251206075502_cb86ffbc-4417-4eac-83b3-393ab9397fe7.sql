-- Add an explicit RESTRICTIVE policy requiring authentication for all access to restaurants table
-- This provides an extra security layer to ensure unauthenticated users cannot access sensitive data
-- even if other policies are misconfigured

CREATE POLICY "Require authentication for all access"
ON public.restaurants
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.role() = 'authenticated');
