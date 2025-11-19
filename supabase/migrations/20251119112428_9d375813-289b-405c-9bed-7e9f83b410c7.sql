-- Create a more robust is_admin function that checks multiple sources
-- Using CREATE OR REPLACE to update the existing function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Check if user has admin role in user_roles table
  -- OR if user email is the designated admin email
  -- OR if user has admin in app_metadata
  SELECT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'tap@tapaway.co'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;