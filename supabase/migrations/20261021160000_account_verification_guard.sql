-- Codes are server-only, durable across workers, and consumed before Auth writes.
ALTER TABLE public.pending_otps ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
REVOKE ALL ON public.pending_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pending_otps TO service_role;

CREATE OR REPLACE FUNCTION public.issue_account_otp(_email text, _code_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid; _normalized text := lower(trim(_email));
BEGIN
  IF length(_normalized) > 254 OR _normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR _code_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid code request'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('account-otp:' || _normalized, 0));
  DELETE FROM public.pending_otps WHERE email = _normalized;
  INSERT INTO public.pending_otps(email, code, expires_at)
  VALUES (_normalized, _code_hash, now() + interval '10 minutes') RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_account_otp(_email text, _code_hash text, _consume boolean DEFAULT true)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.pending_otps%ROWTYPE; _normalized text := lower(trim(_email));
BEGIN
  IF _code_hash IS NULL OR _code_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  -- Same lock as issuance: resending cannot race verification of the old code.
  PERFORM pg_advisory_xact_lock(hashtextextended('account-otp:' || _normalized, 0));
  SELECT * INTO _row FROM public.pending_otps WHERE email = _normalized
    ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR _row.verified_at IS NOT NULL OR _row.expires_at <= now() OR _row.failed_attempts >= 5 THEN RETURN false; END IF;
  IF _row.code <> _code_hash THEN
    UPDATE public.pending_otps SET failed_attempts = failed_attempts + 1 WHERE id = _row.id;
    RETURN false;
  END IF;
  IF _consume THEN UPDATE public.pending_otps SET verified_at = now() WHERE id = _row.id; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_account_otp(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_account_otp(text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_account_otp(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_account_otp(text,text,boolean) TO service_role;
