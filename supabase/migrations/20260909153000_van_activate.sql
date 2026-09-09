-- Van mode: admin "activate" stage for the fulfillment pipeline.
--
-- Adds the 'activated' stage columns on personal_profiles and the
-- admin_activate_card() RPC, which performs the admin-side NFC claim:
-- flips the chosen nfc_cards row unclaimed -> claimed, binds its
-- destination_value to the hub username, and moves the profile to
-- pipeline_status = 'activated'.
--
-- DEPENDENCY: pipeline_status = 'activated' requires the CHECK value added
-- by the sibling pipeline migration (2026090914xxxx series). Apply that
-- migration BEFORE running this one, or the UPDATE in admin_activate_card
-- will raise a CHECK violation.
--
-- Idempotent: every statement is safe to re-run.

-- 1. Columns (additive; no FK on activated_card_id because nfc_cards.id's
--    exact PG type (uuid vs text) could not be verified from the repo;
--    storing as text is compatible with both).
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid,
  ADD COLUMN IF NOT EXISTS activated_card_id text,
  ADD COLUMN IF NOT EXISTS source text;

-- 2. Admin activate RPC (mirrors admin_set_print_status: SECURITY DEFINER,
--    is_admin() gate, admin_audit_log entry).
CREATE OR REPLACE FUNCTION public.admin_activate_card(_profile_id uuid, _card_public_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_card    record;
  v_code    text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  IF _profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id is required';
  END IF;
  v_code := upper(btrim(COALESCE(_card_public_code, '')));
  IF v_code = '' THEN
    RAISE EXCEPTION 'card public code is required';
  END IF;

  SELECT id, user_id, username, pipeline_status
    INTO v_profile
    FROM public.personal_profiles
   WHERE id = _profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown profile: %', _profile_id;
  END IF;
  IF v_profile.username IS NULL OR btrim(v_profile.username) = '' THEN
    RAISE EXCEPTION 'Profile % has no username; cannot bind a card', _profile_id;
  END IF;

  SELECT id, public_code, status
    INTO v_card
    FROM public.nfc_cards
   WHERE public_code = v_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown card code: %', v_code;
  END IF;
  IF v_card.status <> 'unclaimed' THEN
    RAISE EXCEPTION 'Card % is already claimed (status=%)', v_card.public_code, v_card.status;
  END IF;

  -- Claim the card for this hub. Race-safe: the write only lands if the
  -- card is still unclaimed; prevent_card_reclaim trigger guards reversal.
  UPDATE public.nfc_cards
     SET status = 'claimed',
         destination_type = 'profile',
         destination_value = v_profile.username,
         owner_user_id = v_profile.user_id,
         claimed_at = now()
   WHERE id = v_card.id
     AND status = 'unclaimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card % was just claimed by someone else', v_card.public_code;
  END IF;

  UPDATE public.personal_profiles
     SET pipeline_status = 'activated',
         activated_at = now(),
         activated_by = auth.uid(),
         activated_card_id = v_card.id::text,
         updated_at = now()
   WHERE id = _profile_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'activate_card', 'personal_profile', _profile_id::text,
          jsonb_build_object(
            'card_id', v_card.id::text,
            'public_code', v_card.public_code,
            'username', v_profile.username,
            'previous_pipeline_status', v_profile.pipeline_status
          ));

  RETURN jsonb_build_object(
    'ok', true,
    'card_id', v_card.id::text,
    'public_code', v_card.public_code,
    'username', v_profile.username
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_card(uuid, text) TO authenticated;
