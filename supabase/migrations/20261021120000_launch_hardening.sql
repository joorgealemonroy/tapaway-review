-- Billing authority belongs to verified server handlers and the owner admin.
-- Existing records are not reclassified or billed by this migration.
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS activation_started_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
ALTER TABLE public.personal_card_orders ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS welcome_email_started_at timestamptz;
ALTER TABLE public.personal_card_orders ADD COLUMN IF NOT EXISTS welcome_email_started_at timestamptz;
ALTER TABLE public.personal_profiles ALTER COLUMN is_approved SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_profile_approval_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE field text;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role() = 'service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscription_status := 'pending'; NEW.is_approved := false;
    NEW.stripe_customer_id := NULL; NEW.stripe_subscription_id := NULL;
    NEW.stripe_connect_account_id := NULL; NEW.is_stripe_onboarded := false;
    NEW.trial_ends_at := NULL; NEW.trial_extension_days := 0;
    NEW.payment_state := 'unknown_manual'; NEW.has_card_addon := false;
    NEW.onboarding_source := NULL; NEW.approved_at := NULL; NEW.approved_by := NULL;
    NEW.pipeline_status := 'draft';
  ELSE
    FOREACH field IN ARRAY ARRAY['id','created_at','user_id','plan_type','subscription_status','is_approved','stripe_customer_id','stripe_subscription_id','stripe_billing_email','stripe_connect_account_id','is_stripe_onboarded','trial_ends_at','trial_extension_days','payment_state','has_card_addon','onboarding_source','approved_at','approved_by','review_note','review_note_at','sales_rep_id','created_by_rep_id'] LOOP
      IF to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN
        RAISE EXCEPTION 'Billing, ownership and approval fields are managed by TapAway' USING ERRCODE='42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_profile_approval_fields ON public.personal_profiles;
CREATE TRIGGER trg_guard_profile_approval_fields BEFORE INSERT OR UPDATE ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_approval_fields();

CREATE OR REPLACE FUNCTION public.guard_restaurant_billing_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  NEW.subscription_status := 'pending'; NEW.trial_ends_at := NULL;
  NEW.stripe_customer_id := NULL; NEW.stripe_subscription_id := NULL; NEW.stripe_portal_url := NULL;
  NEW.payment_state := 'unknown_manual'; NEW.is_approved := false;
  NEW.is_legacy_user := false; NEW.has_loss_protection := false; NEW.ai_coach_unlocked := false;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.guard_restaurant_billing_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE field text;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  FOREACH field IN ARRAY ARRAY['id','created_at','owner_id','plan_type','subscription_status','stripe_customer_id','stripe_subscription_id','stripe_portal_url','next_billing_date','trial_ends_at','payment_state','is_approved','is_legacy_user','has_loss_protection','ai_coach_unlocked','sales_rep_id','created_by','expires_at'] LOOP
    IF to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN
      RAISE EXCEPTION 'Billing, ownership and approval fields are managed by TapAway' USING ERRCODE='42501';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

-- These maintenance routines have no browser use and previously lacked caller checks.
REVOKE ALL ON FUNCTION public.cleanup_expired_archives() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_archives() TO service_role;
REVOKE ALL ON FUNCTION public.recompute_closer_pool(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_closer_pool(uuid,text) TO service_role;

-- Preserve already-approved, unbilled staff demo/gift hubs as of the reviewed source snapshot.
-- New browser inserts cannot set approval or backdate a later row.
-- Paid trials are time bounded even if a webhook or scheduled reconciliation is delayed.
CREATE OR REPLACE FUNCTION public.hub_access_allowed(_status text,_approved boolean,_payment text,_trial_end timestamptz,_created timestamptz,_subscription text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT (_payment='complimentary') OR _status='active' OR
    (_status='trialing' AND _approved IS TRUE AND (
      (_subscription IS NOT NULL AND COALESCE(_trial_end,_created+interval '14 days')>now())
      OR (_subscription IS NULL AND _created <= timestamptz '2026-10-21 03:34:37+00')
    ));
$$;
REVOKE ALL ON FUNCTION public.hub_access_allowed(text,boolean,text,timestamptz,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hub_access_allowed(text,boolean,text,timestamptz,timestamptz,text) TO anon,authenticated,service_role;
DROP POLICY IF EXISTS "Public can view approved active profiles" ON public.personal_profiles;
CREATE POLICY "Public can view approved active profiles" ON public.personal_profiles FOR SELECT TO anon,authenticated USING (
  public.hub_access_allowed(subscription_status,is_approved,payment_state,trial_ends_at,created_at,stripe_subscription_id)
);
CREATE OR REPLACE FUNCTION public.personal_profile_is_active(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.personal_profiles p WHERE p.id=_profile_id AND public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id));
$$;
-- Preserve RPC signatures and projections while replacing only their access predicate.
DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.get_public_personal_profile(text)'::regprocedure) INTO definition;
 definition := replace(definition, E'p.subscription_status = ''active''\n      OR (p.subscription_status = ''trialing'' AND p.is_approved = true)', 'public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id)');
 IF position('hub_access_allowed' in definition)=0 THEN RAISE EXCEPTION 'Unexpected personal hub function; review required'; END IF;
 EXECUTE definition;
 SELECT pg_get_functiondef('public.get_public_restaurant_hub(text,uuid)'::regprocedure) INTO definition;
 definition := replace(definition, E'r.subscription_status = ''active''\n      OR (r.subscription_status = ''trialing'' AND r.is_approved = true)\n      OR r.payment_state = ''complimentary''', 'public.hub_access_allowed(r.subscription_status,r.is_approved,r.payment_state,r.trial_ends_at,r.created_at,r.stripe_subscription_id)');
 IF position('hub_access_allowed' in definition)=0 THEN RAISE EXCEPTION 'Unexpected restaurant hub function; review required'; END IF;
 EXECUTE definition;
END $$;

ALTER TABLE public.email_sends ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE public.email_sends ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;
CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  event_id text PRIMARY KEY, resend_id text NOT NULL, status text NOT NULL,
  occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.email_delivery_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.email_delivery_events TO service_role;
GRANT SELECT ON public.email_delivery_events TO authenticated;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads delivery events" ON public.email_delivery_events FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX IF NOT EXISTS email_delivery_resend_idx ON public.email_delivery_events(resend_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION public.record_email_delivery(_event_id text,_resend_id text,_status text,_occurred_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _status NOT IN ('sent','delivered','bounced','complained','failed') THEN RAISE EXCEPTION 'Invalid email status'; END IF;
  INSERT INTO public.email_delivery_events(event_id,resend_id,status,occurred_at) VALUES(_event_id,_resend_id,_status,_occurred_at) ON CONFLICT DO NOTHING;
  UPDATE public.email_sends SET delivery_status=_status, delivery_updated_at=_occurred_at
  WHERE resend_id=_resend_id AND (delivery_updated_at IS NULL OR delivery_updated_at<=_occurred_at)
  AND (delivery_status IS NULL OR delivery_status NOT IN ('bounced','complained','failed') OR _status IN ('bounced','complained','failed'))
  AND NOT (delivery_status='delivered' AND _status='sent');
END $$;
REVOKE ALL ON FUNCTION public.record_email_delivery(text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_delivery(text,text,text,timestamptz) TO service_role;

-- Delivery can arrive before the sender finishes recording the provider's response.
CREATE OR REPLACE FUNCTION public.attach_early_email_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 SELECT status,occurred_at INTO NEW.delivery_status,NEW.delivery_updated_at
 FROM public.email_delivery_events WHERE resend_id=NEW.resend_id
 ORDER BY CASE WHEN status IN ('bounced','complained','failed') THEN 2 WHEN status='delivered' THEN 1 ELSE 0 END DESC,occurred_at DESC LIMIT 1;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS attach_early_email_delivery ON public.email_sends;
CREATE TRIGGER attach_early_email_delivery BEFORE INSERT ON public.email_sends FOR EACH ROW EXECUTE FUNCTION public.attach_early_email_delivery();
