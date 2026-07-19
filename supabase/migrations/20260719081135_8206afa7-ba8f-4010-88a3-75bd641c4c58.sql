CREATE OR REPLACE FUNCTION public.assign_founding_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Skip founding assignment for sales-rep-created demo hubs; they get a real trial.
  IF NEW.sales_rep_id IS NOT NULL OR NEW.created_by_rep_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
$$;