ALTER TABLE public.payment_first_config ADD COLUMN IF NOT EXISTS payment_first_launch_at timestamptz;
COMMENT ON COLUMN public.payment_first_config.payment_first_launch_at IS 'Legacy cutoff. NULL = not launched; records created before this timestamp via the old flow with paid Stripe billing get the legacy allowance.';

CREATE OR REPLACE FUNCTION public.legacy_auto_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cutoff timestamptz; _src text;
BEGIN
  IF NEW.legacy_allowance OR NEW.legacy_allowance_source IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.stripe_customer_id IS NULL OR COALESCE(NEW.stripe_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.subscription_status,'') NOT IN ('active','trialing') THEN RETURN NEW; END IF;
  IF COALESCE(NEW.email,'') ILIKE '%@demo.tapaway.local' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'personal_profiles' THEN
    _src := to_jsonb(NEW)->>'onboarding_source';
    IF COALESCE(_src,'') LIKE 'payment_first%' THEN RETURN NEW; END IF;
  END IF;
  SELECT payment_first_launch_at INTO _cutoff FROM public.payment_first_config WHERE id = 1;
  IF _cutoff IS NOT NULL AND NEW.created_at >= _cutoff THEN RETURN NEW; END IF;
  NEW.legacy_allowance := true;
  NEW.legacy_allowance_key := NEW.stripe_subscription_id;
  NEW.legacy_allowance_source := 'pre_launch_old_flow';
  NEW.legacy_allowance_granted_at := now();
  INSERT INTO public.legacy_allowance_entitlements (relationship_key, source, record_count)
    VALUES (NEW.stripe_subscription_id, 'pre_launch_old_flow', 1)
    ON CONFLICT (relationship_key) DO UPDATE SET record_count = public.legacy_allowance_entitlements.record_count + 1;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.legacy_auto_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_legacy_auto_grant ON public.personal_profiles;
CREATE TRIGGER trg_legacy_auto_grant BEFORE INSERT OR UPDATE OF stripe_subscription_id, stripe_customer_id, subscription_status
  ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.legacy_auto_grant();
DROP TRIGGER IF EXISTS trg_legacy_auto_grant ON public.restaurants;
CREATE TRIGGER trg_legacy_auto_grant BEFORE INSERT OR UPDATE OF stripe_subscription_id, stripe_customer_id, subscription_status
  ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.legacy_auto_grant();