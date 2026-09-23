-- M-5 fix: close the promo-token burn race.
--
-- Previously a token was only burned when the first checkout *completed*, so
-- N concurrent checkout sessions could each redeem the same token. Session
-- creation now stamps reserved_by/reserved_at (see create-checkout-session);
-- the reservation self-heals after 60 minutes so abandoned checkouts don't
-- lock a token forever. The webhook burn remains as the final mark.

ALTER TABLE public.promo_tokens
  ADD COLUMN IF NOT EXISTS reserved_by uuid NULL,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_promo_tokens_reserved_at
  ON public.promo_tokens (reserved_at)
  WHERE reserved_at IS NOT NULL AND is_used = false;

-- M-5: atomic compare-and-set reservation. Returns true ONLY when this caller
-- actually acquired the reservation: the token must be unused and unexpired,
-- and either unreserved, reserved by this same user (idempotent re-entry),
-- or holding a stale reservation (older than p_hold_minutes). Concurrent
-- checkouts race on this single UPDATE; exactly one wins.
CREATE OR REPLACE FUNCTION public.reserve_promo_token(
  p_token_id uuid,
  p_user_id uuid,
  p_hold_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.promo_tokens
  SET reserved_by = p_user_id,
      reserved_at = now()
  WHERE id = p_token_id
    AND is_used = false
    AND expires_at > now()
    AND (
      reserved_by IS NULL
      OR reserved_by = p_user_id
      OR reserved_at < now() - make_interval(mins => p_hold_minutes)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Only the service role (edge functions) may reserve tokens.
REVOKE ALL ON FUNCTION public.reserve_promo_token(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_promo_token(uuid, uuid, integer) FROM anon, authenticated;

-- Atomic free-promo redemption: burn the token AND activate the caller's own
-- restaurant in one transaction. Burning first means exactly one concurrent
-- caller wins; a lost race returns false. If the restaurant row isn't owned
-- by the caller the whole transaction aborts, so the token is never burned
-- without the activation (and vice versa).
CREATE OR REPLACE FUNCTION public.redeem_free_promo_token(
  p_token_id uuid,
  p_user_id uuid,
  p_restaurant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_burned integer;
  v_activated integer;
BEGIN
  UPDATE public.promo_tokens
  SET is_used = true,
      used_by_user_id = p_user_id,
      reserved_by = null,
      reserved_at = null
  WHERE id = p_token_id
    AND is_used = false
    AND expires_at > now()
    AND discount_type = 'free';
  GET DIAGNOSTICS v_burned = ROW_COUNT;
  IF v_burned = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.restaurants
  SET subscription_status = 'active',
      onboarding_completed = true,
      onboarding_step = 4
  WHERE id = p_restaurant_id
    AND owner_id = p_user_id;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated = 0 THEN
    RAISE EXCEPTION 'redeem_free_promo_token: restaurant % not owned by caller', p_restaurant_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_free_promo_token(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_free_promo_token(uuid, uuid, uuid) FROM anon, authenticated;