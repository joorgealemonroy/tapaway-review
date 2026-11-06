-- Explicit, private links between a retained billing/history record and its new editor.
CREATE TABLE IF NOT EXISTS public.legacy_hub_migrations (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id),
  profile_id uuid UNIQUE NOT NULL REFERENCES public.personal_profiles(id),
  original_slug text NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  restaurant_snapshot jsonb NOT NULL
);
ALTER TABLE public.legacy_hub_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_hub_migrations FROM anon, authenticated;
GRANT ALL ON public.legacy_hub_migrations TO service_role;

-- Stripe's legacy events can address either the original restaurant ID or the
-- customer/subscription. Keep the two projections consistent without changing
-- any Stripe subscription, price or existing allowance relationship key.
CREATE OR REPLACE FUNCTION public.sync_migrated_hub_billing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
  IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='restaurants' THEN
    SELECT m.profile_id INTO target FROM legacy_hub_migrations m JOIN personal_profiles p ON p.id=m.profile_id
    WHERE m.restaurant_id=NEW.id AND p.user_id=NEW.owner_id;
    IF target IS NOT NULL THEN
      UPDATE personal_profiles SET subscription_status=NEW.subscription_status, payment_state=NEW.payment_state,
        stripe_customer_id=NEW.stripe_customer_id,stripe_subscription_id=NEW.stripe_subscription_id,
        trial_ends_at=NEW.trial_ends_at,plan_type=NEW.plan_type,is_approved=NEW.is_approved,
        legacy_allowance=NEW.legacy_allowance,legacy_allowance_key=NEW.legacy_allowance_key,
        legacy_allowance_source=NEW.legacy_allowance_source,legacy_allowance_granted_at=NEW.legacy_allowance_granted_at
      WHERE id=target;
    END IF;
  ELSE
    SELECT m.restaurant_id INTO target FROM legacy_hub_migrations m JOIN restaurants r ON r.id=m.restaurant_id
    WHERE m.profile_id=NEW.id AND r.owner_id=NEW.user_id;
    IF target IS NOT NULL THEN
      UPDATE restaurants SET subscription_status=NEW.subscription_status, payment_state=NEW.payment_state,
        stripe_customer_id=NEW.stripe_customer_id,stripe_subscription_id=NEW.stripe_subscription_id,
        trial_ends_at=NEW.trial_ends_at,plan_type=NEW.plan_type,is_approved=NEW.is_approved,
        legacy_allowance=NEW.legacy_allowance,legacy_allowance_key=NEW.legacy_allowance_key,
        legacy_allowance_source=NEW.legacy_allowance_source,legacy_allowance_granted_at=NEW.legacy_allowance_granted_at
      WHERE id=target;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_migrated_hub_billing() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_migrated_hub_billing ON public.restaurants;
CREATE TRIGGER sync_migrated_hub_billing AFTER UPDATE OF subscription_status,payment_state,stripe_customer_id,stripe_subscription_id,trial_ends_at,plan_type,is_approved,legacy_allowance,legacy_allowance_key,legacy_allowance_source,legacy_allowance_granted_at ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.sync_migrated_hub_billing();
DROP TRIGGER IF EXISTS sync_migrated_hub_billing ON public.personal_profiles;
CREATE TRIGGER sync_migrated_hub_billing AFTER UPDATE OF subscription_status,payment_state,stripe_customer_id,stripe_subscription_id,trial_ends_at,plan_type,is_approved,legacy_allowance,legacy_allowance_key,legacy_allowance_source,legacy_allowance_granted_at ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_migrated_hub_billing();
