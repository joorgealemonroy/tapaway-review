CREATE OR REPLACE FUNCTION public.personal_profile_is_active(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE id = _profile_id
      AND (
        subscription_status = 'active'
        OR (subscription_status = 'trialing' AND is_approved = true)
      )
  );
$function$;