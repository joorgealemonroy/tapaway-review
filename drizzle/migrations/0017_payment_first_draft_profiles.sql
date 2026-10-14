ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS onboarding_source text;
CREATE OR REPLACE FUNCTION public.assign_founding_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE current_count INTEGER;
BEGIN
  -- Skip founding assignment for rep-created demo hubs and payment-first drafts (billing comes from Stripe).
  IF NEW.sales_rep_id IS NOT NULL OR NEW.created_by_rep_id IS NOT NULL OR NEW.onboarding_source = 'payment_first' THEN
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
CREATE TABLE IF NOT EXISTS public.payment_first_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  test_access_key text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_first_config TO service_role;
GRANT SELECT ON public.payment_first_config TO authenticated;
ALTER TABLE public.payment_first_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment-first config" ON public.payment_first_config FOR SELECT TO authenticated USING (public.is_admin());
INSERT INTO public.payment_first_config (id) VALUES (1) ON CONFLICT DO NOTHING;