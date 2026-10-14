-- Payment-first onboarding + Card Club. Additive only.

ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS legacy_allowance boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS legacy_allowance boolean NOT NULL DEFAULT false;

CREATE TABLE public.checkout_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL CHECK (plan IN ('solo','venue')),
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','year')),
  card_quantity integer NOT NULL,
  main_price_id text NOT NULL,
  card_club_selected boolean NOT NULL DEFAULT false,
  card_club_price_id text,
  onboarding_version text NOT NULL DEFAULT 'payment_first_v1',
  checkout_source text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_checkout_session_id text UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  email text,
  user_id uuid,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','checkout_started','paid','pending_association','associated','failed','abandoned','needs_review')),
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.checkout_intents TO service_role;
GRANT SELECT ON public.checkout_intents TO authenticated;
ALTER TABLE public.checkout_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own intents" ON public.checkout_intents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_intent_id uuid NOT NULL UNIQUE REFERENCES public.checkout_intents(id),
  user_id uuid,
  personal_profile_id uuid,
  restaurant_id uuid,
  stripe_subscription_id text,
  step text NOT NULL DEFAULT 'business' CHECK (step IN ('business','logo','shipping','done')),
  setup_status text NOT NULL DEFAULT 'purchase_complete' CHECK (setup_status IN (
    'purchase_complete','business_identified','needs_business_research','logo_received','logo_needed',
    'links_being_prepared','hub_ready','cards_ready_to_print','cards_printed','ready_to_ship','shipped')),
  google_place_id text,
  business_name text,
  business_address text,
  business_city text,
  business_link text,
  place_details jsonb,
  needs_research boolean NOT NULL DEFAULT false,
  logo_url text,
  logo_skipped boolean NOT NULL DEFAULT false,
  shipping_address jsonb,
  billing_address jsonb,
  shipping_confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.onboarding_sessions TO service_role;
GRANT SELECT ON public.onboarding_sessions TO authenticated;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own onboarding" ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.card_club_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_intent_id uuid UNIQUE REFERENCES public.checkout_intents(id),
  user_id uuid,
  stripe_customer_id text,
  main_stripe_subscription_id text NOT NULL,
  card_club_stripe_subscription_id text,
  card_club_stripe_subscription_item_id text,
  stripe_price_id text,
  status text NOT NULL CHECK (status IN ('offered','declined','pending_activation','activation_failed','active','past_due','cancelled')),
  plan text NOT NULL CHECK (plan IN ('solo','venue')),
  enrollment_date timestamptz,
  declined_at timestamptz,
  card_club_paid_at timestamptz,
  cancellation_date timestamptz,
  replacement_interval_days integer NOT NULL DEFAULT 30,
  last_redemption_at timestamptz,
  total_redemptions integer NOT NULL DEFAULT 0,
  admin_override boolean NOT NULL DEFAULT false,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX card_club_memberships_cc_sub_uidx ON public.card_club_memberships(card_club_stripe_subscription_id) WHERE card_club_stripe_subscription_id IS NOT NULL;
CREATE INDEX card_club_memberships_user_idx ON public.card_club_memberships(user_id);
CREATE INDEX card_club_memberships_main_sub_idx ON public.card_club_memberships(main_stripe_subscription_id);
GRANT ALL ON public.card_club_memberships TO service_role;
GRANT SELECT ON public.card_club_memberships TO authenticated;
ALTER TABLE public.card_club_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own membership" ON public.card_club_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.card_club_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.card_club_memberships(id),
  user_id uuid NOT NULL,
  main_stripe_subscription_id text,
  eligibility_period_start timestamptz NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  quantity integer NOT NULL,
  shipping_address jsonb NOT NULL,
  design_version text NOT NULL DEFAULT 'current',
  design_update_note text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','in_review','printing','shipped','cancelled')),
  printed_at timestamptz,
  shipped_at timestamptz,
  tracking_number text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, eligibility_period_start)
);
GRANT ALL ON public.card_club_redemptions TO service_role;
GRANT SELECT ON public.card_club_redemptions TO authenticated;
ALTER TABLE public.card_club_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own redemptions" ON public.card_club_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TRIGGER trg_checkout_intents_updated BEFORE UPDATE ON public.checkout_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_onboarding_sessions_updated BEFORE UPDATE ON public.onboarding_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_card_club_memberships_updated BEFORE UPDATE ON public.card_club_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_card_club_redemptions_updated BEFORE UPDATE ON public.card_club_redemptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Central entitlement. Rolling 30 days from actual paid activation or last approved request; never stacks.
CREATE OR REPLACE FUNCTION public.card_club_entitlement(_membership_id uuid)
RETURNS TABLE(eligible boolean, reason text, quantity integer, next_eligible_at timestamptz, period_start timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  m public.card_club_memberships%ROWTYPE;
  v_anchor timestamptz;
  v_next timestamptz;
  v_qty integer;
BEGIN
  SELECT * INTO m FROM public.card_club_memberships WHERE id = _membership_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found', 0, NULL::timestamptz, NULL::timestamptz; RETURN;
  END IF;
  IF auth.role() <> 'service_role' AND NOT public.is_admin() AND m.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  v_qty := CASE WHEN m.plan = 'venue' THEN 15 ELSE 4 END;
  IF m.status <> 'active' OR m.card_club_paid_at IS NULL THEN
    RETURN QUERY SELECT false, 'not_active', v_qty, NULL::timestamptz, NULL::timestamptz; RETURN;
  END IF;
  v_anchor := COALESCE(m.last_redemption_at, m.card_club_paid_at);
  v_next := v_anchor + make_interval(days => m.replacement_interval_days);
  IF now() < v_next THEN
    RETURN QUERY SELECT false, 'not_yet_eligible', v_qty, v_next, v_next; RETURN;
  END IF;
  RETURN QUERY SELECT true, 'eligible', v_qty, v_next, v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.card_club_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.card_club_entitlement(uuid) TO authenticated, service_role;