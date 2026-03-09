CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(lookup_email text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE lower(au.email) = lower(lookup_email)
  LIMIT 1;
$$;