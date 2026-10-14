ALTER TABLE public.card_club_redemptions ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS rejected_at timestamptz, ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.card_club_redemptions DROP CONSTRAINT IF EXISTS card_club_redemptions_status_check;
ALTER TABLE public.card_club_redemptions ADD CONSTRAINT card_club_redemptions_status_check CHECK (status IN ('requested','in_review','approved','printing','shipped','rejected','cancelled'));
ALTER TABLE public.card_club_redemptions DROP CONSTRAINT IF EXISTS card_club_redemptions_membership_id_eligibility_period_star_key;
-- Only one open (not rejected/cancelled) redemption may consume a given eligibility period, and only one may be pending.
CREATE UNIQUE INDEX IF NOT EXISTS card_club_redemptions_one_per_period ON public.card_club_redemptions (membership_id, eligibility_period_start) WHERE status NOT IN ('rejected','cancelled');
CREATE UNIQUE INDEX IF NOT EXISTS card_club_redemptions_one_pending ON public.card_club_redemptions (membership_id) WHERE status IN ('requested','in_review');

ALTER TABLE public.card_club_memberships ADD COLUMN IF NOT EXISTS last_approved_at timestamptz, ADD COLUMN IF NOT EXISTS stripe_livemode boolean NOT NULL DEFAULT false;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS stripe_livemode boolean NOT NULL DEFAULT false;
ALTER TABLE public.onboarding_sessions ADD COLUMN IF NOT EXISTS personal_profile_id uuid, ADD COLUMN IF NOT EXISTS fulfillment_order_id uuid, ADD COLUMN IF NOT EXISTS hub_status text NOT NULL DEFAULT 'none', ADD COLUMN IF NOT EXISTS artwork_ready_at timestamptz;
ALTER TABLE public.fulfillment_orders ADD COLUMN IF NOT EXISTS checkout_intent_id uuid UNIQUE, ADD COLUMN IF NOT EXISTS personal_profile_id uuid, ADD COLUMN IF NOT EXISTS card_club_selected boolean, ADD COLUMN IF NOT EXISTS billing_interval text, ADD COLUMN IF NOT EXISTS attribution jsonb, ADD COLUMN IF NOT EXISTS stripe_livemode boolean, ADD COLUMN IF NOT EXISTS tracking_number text, ADD COLUMN IF NOT EXISTS order_source text;
COMMENT ON COLUMN public.card_club_memberships.last_redemption_at IS 'Last request time (informational). Eligibility uses last_approved_at.';

CREATE OR REPLACE FUNCTION public.card_club_entitlement(_membership_id uuid)
 RETURNS TABLE(eligible boolean, reason text, quantity integer, next_eligible_at timestamptz, period_start timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE m public.card_club_memberships%ROWTYPE; v_next timestamptz; v_qty integer;
BEGIN
  SELECT * INTO m FROM public.card_club_memberships WHERE id = _membership_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'not_found', 0, NULL::timestamptz, NULL::timestamptz; RETURN; END IF;
  IF auth.role() <> 'service_role' AND NOT public.is_admin() AND m.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Access denied'; END IF;
  v_qty := CASE WHEN m.plan = 'venue' THEN 15 ELSE 4 END;
  IF m.status <> 'active' OR m.card_club_paid_at IS NULL THEN
    RETURN QUERY SELECT false, 'not_active', v_qty, NULL::timestamptz, NULL::timestamptz; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.card_club_redemptions r WHERE r.membership_id = m.id AND r.status IN ('requested','in_review')) THEN
    RETURN QUERY SELECT false, 'request_pending', v_qty, NULL::timestamptz, NULL::timestamptz; RETURN; END IF;
  -- First eligibility: actual first paid date + interval. Afterwards: last APPROVAL + interval.
  v_next := COALESCE(m.last_approved_at, m.card_club_paid_at) + make_interval(days => m.replacement_interval_days);
  IF now() < v_next THEN RETURN QUERY SELECT false, 'not_yet_eligible', v_qty, v_next, v_next; RETURN; END IF;
  RETURN QUERY SELECT true, 'eligible', v_qty, v_next, v_next;
END; $$;

CREATE OR REPLACE FUNCTION public.card_club_redeem(_membership_id uuid, _address jsonb, _design_note text, _idempotency_key text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE m public.card_club_memberships%ROWTYPE; e record; v_existing public.card_club_redemptions%ROWTYPE; v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO v_existing FROM public.card_club_redemptions WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object('ok', true, 'redemption_id', v_existing.id, 'duplicate', true); END IF;
  SELECT * INTO m FROM public.card_club_memberships WHERE id = _membership_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT * INTO e FROM public.card_club_entitlement(_membership_id);
  IF NOT e.eligible THEN RETURN jsonb_build_object('ok', false, 'reason', e.reason, 'next_eligible_at', e.next_eligible_at); END IF;
  IF _address IS NULL OR coalesce(_address->>'line1','') = '' OR coalesce(_address->>'postal_code','') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_address'); END IF;
  INSERT INTO public.card_club_redemptions (membership_id, user_id, main_stripe_subscription_id, eligibility_period_start, quantity, shipping_address, design_version, design_update_note, idempotency_key)
  VALUES (m.id, m.user_id, m.main_stripe_subscription_id, e.period_start, e.quantity, _address,
    CASE WHEN nullif(btrim(_design_note), '') IS NULL THEN 'current' ELSE 'update_requested' END,
    nullif(left(btrim(_design_note), 1000), ''), _idempotency_key)
  RETURNING id INTO v_id;
  UPDATE public.card_club_memberships SET last_redemption_at = now() WHERE id = m.id;
  RETURN jsonb_build_object('ok', true, 'redemption_id', v_id, 'quantity', e.quantity);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_card_club_decide(_redemption_id uuid, _approve boolean, _reason text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.card_club_redemptions%ROWTYPE; v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO r FROM public.card_club_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF r.status NOT IN ('requested','in_review') THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_decided', 'status', r.status); END IF;
  IF _approve THEN
    UPDATE public.card_club_redemptions SET status = 'approved', approved_at = v_now, approved_by = auth.uid() WHERE id = r.id;
    UPDATE public.card_club_memberships SET last_approved_at = v_now, total_redemptions = total_redemptions + 1 WHERE id = r.membership_id;
  ELSE
    UPDATE public.card_club_redemptions SET status = 'rejected', rejected_at = v_now, rejection_reason = left(_reason, 500) WHERE id = r.id;
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'card_club_approve' ELSE 'card_club_reject' END, 'card_club_redemption', r.id::text, jsonb_build_object('reason', _reason));
  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, 'approved_at', CASE WHEN _approve THEN v_now END);
END; $$;
REVOKE ALL ON FUNCTION public.admin_card_club_decide(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_card_club_decide(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_redemption_progress(_redemption_id uuid, _status text, _tracking text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF _status NOT IN ('printing','shipped') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.card_club_redemptions SET status = _status,
    printed_at = CASE WHEN _status = 'printing' THEN coalesce(printed_at, now()) ELSE printed_at END,
    shipped_at = CASE WHEN _status = 'shipped' THEN now() ELSE shipped_at END,
    tracking_number = coalesce(_tracking, tracking_number)
  WHERE id = _redemption_id AND status IN ('approved','printing');
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_redemption_progress(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_redemption_progress(uuid, text, text) TO authenticated;

-- Setup progression: print queue only via admin, and never for test orders.
CREATE OR REPLACE FUNCTION public.admin_set_setup_status(_session_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.onboarding_sessions%ROWTYPE; v_live boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO s FROM public.onboarding_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  SELECT stripe_livemode INTO v_live FROM public.checkout_intents WHERE id = s.checkout_intent_id;
  UPDATE public.onboarding_sessions SET setup_status = _status,
    hub_status = CASE WHEN _status = 'hub_ready' THEN 'ready' ELSE hub_status END,
    artwork_ready_at = CASE WHEN _status = 'cards_ready_to_print' THEN coalesce(artwork_ready_at, now()) ELSE artwork_ready_at END
  WHERE id = _session_id;
  IF s.fulfillment_order_id IS NOT NULL THEN
    UPDATE public.fulfillment_orders SET status = CASE
      WHEN _status = 'cards_ready_to_print' AND coalesce(v_live, false) THEN 'pending'
      WHEN _status = 'cards_ready_to_print' THEN 'test_ready_to_print'
      WHEN _status IN ('cards_printed','ready_to_ship','shipped') THEN _status
      ELSE 'awaiting_onboarding' END
    WHERE id = s.fulfillment_order_id;
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'set_setup_status', 'onboarding_session', _session_id::text, jsonb_build_object('status', _status));
END; $$;