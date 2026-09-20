-- H-1 fix: stop restaurant owners from self-granting paid billing state.
--
-- Mirrors the personal_profiles guard trigger pattern
-- (20260801083639 guard_profile_approval_fields): billing columns on
-- public.restaurants can only be written by the service role (Stripe webhook,
-- cron, promo redemption) or admins. Authenticated owners keep full write
-- access to every non-billing column.
--
-- Legit client flows preserved:
--   * Onboarding inserts/updates with subscription_status='trialing',
--     plan_type=<chosen plan>, trial_ends_at=<now+14d> still pass:
--     the INSERT trigger coerces billing columns to trial-start values and
--     the UPDATE trigger allows re-affirming 'trialing' and refreshing
--     trial_ends_at within the 15-day trial window.
--   * The free-promo 'active' grant moved server-side into
--     validate-promo-token (service role), so the client no longer writes it.
--   * Admin UI writes (Admin.tsx, AdminUnifiedAccountsTable) run as admin
--     users and bypass via public.is_admin().
--
-- Part (b): the old "System can insert restaurants" WITH CHECK (true) policy
-- was already dropped in 20251114212749. The remaining INSERT policies
-- ("restaurants_insert_owner", "Users can insert their own restaurant") are
-- TO authenticated with owner_id = auth.uid() checks, so anonymous callers
-- cannot insert. Re-asserted defensively below.

-- Defensive: make sure the historic open-insert policy can never come back
-- via an out-of-order migration replay.
DROP POLICY IF EXISTS "System can insert restaurants" ON public.restaurants;

CREATE OR REPLACE FUNCTION public.guard_restaurant_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (Stripe webhook, cron, edge functions) bypasses RLS and this
  -- guard entirely. NOTE: auth.uid() is NULL for service_role, so the check
  -- must be on auth.role(), not auth.uid().
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- subscription_status: non-admin callers may only (re)affirm the
  -- trial-start state on a row that has never left it. Every privileged
  -- state ('active', 'past_due', 'canceled', ...) is granted server-side
  -- (Stripe webhook, promo redemption).
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    IF NOT (OLD.subscription_status IS NULL OR OLD.subscription_status = 'trialing')
       OR NEW.subscription_status IS DISTINCT FROM 'trialing' THEN
      RAISE EXCEPTION 'Billing fields cannot be changed from the client';
    END IF;
  END IF;

  -- plan_type: locked once set; plan changes go through checkout.
  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    RAISE EXCEPTION 'Billing fields cannot be changed from the client';
  END IF;

  -- trial_ends_at: may only be (re)set within the trial window. Blocks
  -- trial_ends_at = '2030-01-01' style extensions while letting onboarding
  -- refresh the 14-day trial date on retry.
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     AND (NEW.trial_ends_at IS NULL OR NEW.trial_ends_at > now() + interval '15 days') THEN
    RAISE EXCEPTION 'Billing fields cannot be changed from the client';
  END IF;

  -- Stripe linkage + payment state are webhook/admin owned, never client-written.
  -- (payment_state='complimentary' keeps family hubs live; it must not be
  -- self-granted.)
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_portal_url IS DISTINCT FROM OLD.stripe_portal_url
     OR NEW.payment_state IS DISTINCT FROM OLD.payment_state THEN
    RAISE EXCEPTION 'Billing fields cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_restaurant_billing_fields ON public.restaurants;
CREATE TRIGGER trg_guard_restaurant_billing_fields
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.guard_restaurant_billing_fields();

-- INSERT guard: the restaurants.subscription_status column defaults to
-- 'active', so a bare client insert would mint a paid row. Coerce
-- client-created rows to trial-start billing values instead, with the trial
-- window set server-side (a caller-supplied trial_ends_at='2030-01-01' is
-- ignored).
CREATE OR REPLACE FUNCTION public.guard_restaurant_billing_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.subscription_status := 'trialing';
  NEW.trial_ends_at := now() + interval '14 days';
  NEW.stripe_customer_id := NULL;
  NEW.stripe_subscription_id := NULL;
  NEW.stripe_portal_url := NULL;
  NEW.payment_state := 'unknown_manual';

  -- plan_type: accept the known catalog values; coerce anything else to the
  -- safe default. The webhook/promo paths (service role) overwrite with the
  -- real purchased plan after checkout.
  IF NEW.plan_type IS NULL OR NEW.plan_type NOT IN (
    'solo', 'venue',
    'solo_yearly', 'venue_yearly',
    'monthly', 'yearly',
    'business_lite', 'restaurant', 'solo_pro',
    'free', 'vip'
  ) THEN
    NEW.plan_type := 'solo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_restaurant_billing_insert ON public.restaurants;
CREATE TRIGGER trg_guard_restaurant_billing_insert
BEFORE INSERT ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.guard_restaurant_billing_insert();
