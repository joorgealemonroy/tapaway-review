CREATE OR REPLACE FUNCTION public.get_founding_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.personal_profiles;
$$;