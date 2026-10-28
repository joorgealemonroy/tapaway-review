-- Retire the automatic founding promotion for future inserts only.
-- Explicit server/admin billing and gift choices are preserved. Existing rows,
-- including founding users and complimentary accounts, are not changed.
CREATE OR REPLACE FUNCTION public.assign_founding_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Public account creation remains a pending draft. Founding status and billing
-- are server/admin decisions, and new rows cannot backdate into legacy benefits.
CREATE OR REPLACE FUNCTION public.guard_profile_approval_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE field text;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role() = 'service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscription_status := 'pending'; NEW.is_approved := false;
    NEW.plan_type := NULL; NEW.is_founding_user := false; NEW.founding_number := NULL;
    NEW.created_at := now();
    NEW.stripe_customer_id := NULL; NEW.stripe_subscription_id := NULL;
    NEW.stripe_connect_account_id := NULL; NEW.is_stripe_onboarded := false;
    NEW.trial_ends_at := NULL; NEW.trial_extension_days := 0;
    NEW.payment_state := 'unknown_manual'; NEW.has_card_addon := false;
    NEW.onboarding_source := NULL; NEW.approved_at := NULL; NEW.approved_by := NULL;
    NEW.pipeline_status := 'draft';
  ELSE
    FOREACH field IN ARRAY ARRAY['id','created_at','user_id','plan_type','is_founding_user','founding_number','subscription_status','is_approved','stripe_customer_id','stripe_subscription_id','stripe_billing_email','stripe_connect_account_id','is_stripe_onboarded','trial_ends_at','trial_extension_days','payment_state','has_card_addon','onboarding_source','approved_at','approved_by','review_note','review_note_at','sales_rep_id','created_by_rep_id'] LOOP
      IF to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN
        RAISE EXCEPTION 'Billing, ownership and approval fields are managed by TapAway' USING ERRCODE='42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
