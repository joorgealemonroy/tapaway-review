DROP FUNCTION IF EXISTS public.require_hub_payment(uuid,uuid);

CREATE OR REPLACE FUNCTION public.require_hub_payment(_profile_id uuid,_requested_by uuid,_end_gift boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.personal_profiles%ROWTYPE; r public.hub_payment_requests%ROWTYPE; version uuid;
BEGIN
  IF _requested_by IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_requested_by AND role='admin') THEN
    RAISE EXCEPTION 'A verified admin is required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO p FROM public.personal_profiles WHERE id=_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hub not found' USING ERRCODE='P0002'; END IF;
  IF p.is_approved IS DISTINCT FROM true OR p.plan_type IS NULL
      OR p.plan_type NOT IN ('solo','solo_pro','monthly','yearly')
      OR COALESCE(p.onboarding_source,'')='personal_cards_v1' THEN
    RAISE EXCEPTION 'Only an approved business hub can receive this offer' USING ERRCODE='22023';
  END IF;
  IF p.stripe_subscription_id IS NOT NULL OR p.subscription_status='past_due'
      OR p.payment_state='paying'
      OR (p.payment_state='complimentary' AND _end_gift IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Paid, linked or complimentary accounts cannot be paused with this action' USING ERRCODE='22023';
  END IF;
  SELECT * INTO r FROM public.hub_payment_requests WHERE profile_id=_profile_id FOR UPDATE;
  IF FOUND AND r.fulfilled_at IS NULL AND p.payment_state='payment_required' THEN
    RETURN r.request_version;
  END IF;
  IF p.subscription_status='active' AND p.payment_state IS DISTINCT FROM 'complimentary' THEN
    RAISE EXCEPTION 'Active accounts cannot be paused with this action' USING ERRCODE='22023';
  END IF;
  IF FOUND THEN
    RAISE EXCEPTION 'This hub already has a payment request; review it before making another' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.hub_payment_requests(profile_id,requested_by)
    VALUES(_profile_id,_requested_by) RETURNING request_version INTO version;
  UPDATE public.personal_profiles SET payment_state='payment_required',updated_at=now() WHERE id=_profile_id;
  RETURN version;
END;
$$;
REVOKE ALL ON FUNCTION public.require_hub_payment(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.require_hub_payment(uuid,uuid,boolean) TO service_role;
