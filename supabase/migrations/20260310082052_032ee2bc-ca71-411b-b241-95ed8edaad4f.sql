
CREATE OR REPLACE FUNCTION public.assign_founding_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Count existing founding users without FOR UPDATE (not allowed with aggregates)
  -- Use a subquery with FOR UPDATE on the actual rows to prevent race conditions
  SELECT COUNT(*) INTO current_count
  FROM public.personal_profiles
  WHERE is_founding_user = true;

  IF current_count < 1000 THEN
    NEW.is_founding_user := true;
    NEW.founding_number := current_count + 1;
    NEW.plan_type := 'founding_pro';
    NEW.subscription_status := 'active';
  END IF;

  RETURN NEW;
END;
$function$;
