ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS reprint_price_cents integer;
COMMENT ON COLUMN public.app_settings.reprint_price_cents IS 'Standard replacement batch price. NULL = not yet approved; UI shows Contact us for reprint pricing.';

CREATE OR REPLACE FUNCTION public.card_club_redeem(_membership_id uuid, _address jsonb, _design_note text, _idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  m public.card_club_memberships%ROWTYPE;
  e record;
  v_existing public.card_club_redemptions%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO v_existing FROM public.card_club_redemptions WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object('ok', true, 'redemption_id', v_existing.id, 'duplicate', true); END IF;

  SELECT * INTO m FROM public.card_club_memberships WHERE id = _membership_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT * INTO e FROM public.card_club_entitlement(_membership_id);
  IF NOT e.eligible THEN RETURN jsonb_build_object('ok', false, 'reason', e.reason, 'next_eligible_at', e.next_eligible_at); END IF;
  IF _address IS NULL OR coalesce(_address->>'line1','') = '' OR coalesce(_address->>'postal_code','') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_address');
  END IF;

  INSERT INTO public.card_club_redemptions (membership_id, user_id, main_stripe_subscription_id, eligibility_period_start,
    quantity, shipping_address, design_version, design_update_note, idempotency_key)
  VALUES (m.id, m.user_id, m.main_stripe_subscription_id, e.period_start, e.quantity, _address,
    CASE WHEN nullif(btrim(_design_note), '') IS NULL THEN 'current' ELSE 'update_requested' END,
    nullif(left(btrim(_design_note), 1000), ''), _idempotency_key)
  RETURNING id INTO v_id;

  UPDATE public.card_club_memberships
     SET last_redemption_at = now(), total_redemptions = total_redemptions + 1
   WHERE id = m.id;
  RETURN jsonb_build_object('ok', true, 'redemption_id', v_id, 'quantity', e.quantity);
END;
$$;
REVOKE ALL ON FUNCTION public.card_club_redeem(uuid, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_club_redeem(uuid, jsonb, text, text) TO service_role;