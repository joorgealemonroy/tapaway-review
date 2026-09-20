-- M-9: drop public INSERT on SMS tables. Writes now go through the
-- service-role sms-opt-in edge function (validated, rate-limited, honeypot).
-- Direct browser INSERTs allowed phone-number harvesting / spam farming.
-- Owner/admin SELECT/UPDATE/DELETE policies are untouched.

DROP POLICY IF EXISTS "Anyone can subscribe to a restaurant SMS list"
  ON public.restaurant_sms_subscribers;

DROP POLICY IF EXISTS "Anyone can submit sms signup"
  ON public.sms_signup_submissions;

-- Atomic opt-in write: the subscriber row and its A2P 10DLC consent audit row
-- commit in one transaction, so a subscriber can never exist without its
-- consent proof (or vice versa). Only the service role (sms-opt-in edge
-- function) may execute it.
CREATE OR REPLACE FUNCTION public.record_sms_optin(
  p_restaurant_id uuid,
  p_name text,
  p_phone text,
  p_marketing_consent boolean,
  p_transactional_consent boolean,
  p_consent_text text,
  p_marketing_consent_text text,
  p_transactional_consent_text text,
  p_user_agent text,
  p_source text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opt_in_at timestamptz := now();
BEGIN
  INSERT INTO public.restaurant_sms_subscribers (
    restaurant_id, name, phone,
    sms_opt_in, sms_opt_in_at,
    sms_marketing_opt_in, sms_marketing_opt_in_at,
    sms_transactional_opt_in, sms_transactional_opt_in_at
  ) VALUES (
    p_restaurant_id, p_name, p_phone,
    true, v_opt_in_at,
    p_marketing_consent, CASE WHEN p_marketing_consent THEN v_opt_in_at ELSE NULL END,
    p_transactional_consent, CASE WHEN p_transactional_consent THEN v_opt_in_at ELSE NULL END
  );

  INSERT INTO public.sms_signup_submissions (
    name, phone,
    consent_text, consent_at,
    marketing_consent_text, marketing_consent_at,
    transactional_consent_text, transactional_consent_at,
    user_agent, source
  ) VALUES (
    p_name, p_phone,
    p_consent_text, v_opt_in_at,
    p_marketing_consent_text, CASE WHEN p_marketing_consent THEN v_opt_in_at ELSE NULL END,
    p_transactional_consent_text, CASE WHEN p_transactional_consent THEN v_opt_in_at ELSE NULL END,
    p_user_agent, p_source
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_sms_optin(uuid, text, text, boolean, boolean, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sms_optin(uuid, text, text, boolean, boolean, text, text, text, text, text) FROM anon, authenticated;
