
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE username = lower(check_username)
  )
  AND NOT EXISTS (
    -- If checking "jorge", also block if "tapjorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE username = 'tap' || lower(check_username)
      AND lower(check_username) NOT LIKE 'tap%'
  )
  AND NOT EXISTS (
    -- If checking "tapjorge", also block if "jorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE lower(check_username) LIKE 'tap%'
      AND username = substring(lower(check_username) from 4)
  )
$$;
