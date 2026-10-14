CREATE OR REPLACE FUNCTION public.assign_founding_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE current_count INTEGER;
BEGIN
  IF NEW.sales_rep_id IS NOT NULL OR NEW.created_by_rep_id IS NOT NULL OR NEW.onboarding_source LIKE 'payment_first%' THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO current_count FROM public.personal_profiles WHERE is_founding_user = true;
  IF current_count < 1000 THEN
    NEW.is_founding_user := true;
    NEW.founding_number := current_count + 1;
    NEW.plan_type := 'founding_pro';
    NEW.subscription_status := 'active';
  END IF;
  RETURN NEW;
END;
$function$;
COMMENT ON COLUMN public.fulfillment_orders.checkout_intent_id IS 'DEPRECATED: payment-first orders live on the draft personal_profiles row (Solo/Pro model).';
COMMENT ON COLUMN public.onboarding_sessions.fulfillment_order_id IS 'DEPRECATED: unused; the draft personal profile is the order record.';
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_sessions_one_profile ON public.onboarding_sessions (personal_profile_id) WHERE personal_profile_id IS NOT NULL;