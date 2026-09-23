-- M-10: velocity guards on public intake tables.
--
-- Direct-table RLS writes cannot see the request IP (no request headers in
-- RLS context) and cannot check honeypots, so per-IP throttling is not
-- possible at the database layer. These BEFORE INSERT triggers enforce
-- per-identifier velocity limits instead ("user limits" in the audit's
-- terms): an attacker cycling identifiers still has to rotate a valid
-- email/phone per handful of rows, which blunts farming and spam floods.
--
-- The functions that already exist (notify-new-lead, support-notification,
-- sms-opt-in) carry their own IP rate limits and honeypots at the edge.
-- Residual risk is documented in the security audit notes.

CREATE OR REPLACE FUNCTION public.throttle_public_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_email text;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    -- 10 bookings per buyer email per hour.
    v_email := lower(trim(COALESCE(NEW.buyer_email, '')));
    SELECT count(*) INTO v_count FROM public.bookings
      WHERE created_at > now() - interval '1 hour'
        AND lower(trim(COALESCE(buyer_email, ''))) = v_email;
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Too many booking requests. Please try again later.';
    END IF;

  ELSIF TG_TABLE_NAME = 'lead_submissions' THEN
    -- 10 submissions per (form, email) per hour. Email lives in submission_data.
    v_email := lower(trim(COALESCE(NEW.submission_data ->> 'email', '')));
    SELECT count(*) INTO v_count FROM public.lead_submissions
      WHERE created_at > now() - interval '1 hour'
        AND form_id = NEW.form_id
        AND lower(trim(COALESCE(submission_data ->> 'email', ''))) = v_email;
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Too many submissions. Please try again later.';
    END IF;

  ELSIF TG_TABLE_NAME = 'personal_email_captures' THEN
    -- 5 captures per (profile, email) per hour.
    v_email := lower(trim(NEW.email));
    SELECT count(*) INTO v_count FROM public.personal_email_captures
      WHERE created_at > now() - interval '1 hour'
        AND profile_id = NEW.profile_id
        AND lower(trim(email)) = v_email;
    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Too many signups. Please try again later.';
    END IF;

  ELSIF TG_TABLE_NAME = 'rep_applications' THEN
    -- Email is UNIQUE (one application per address, ever). Backstop against
    -- attackers cycling addresses: max 30 applications per hour globally.
    SELECT count(*) INTO v_count FROM public.rep_applications
      WHERE created_at > now() - interval '1 hour';
    IF v_count >= 30 THEN
      RAISE EXCEPTION 'Too many applications. Please try again later.';
    END IF;

  ELSIF TG_TABLE_NAME = 'support_requests' THEN
    -- 5 support requests per email per hour.
    v_email := lower(trim(NEW.email));
    SELECT count(*) INTO v_count FROM public.support_requests
      WHERE created_at > now() - interval '1 hour'
        AND lower(trim(email)) = v_email;
    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Too many requests. Please try again later.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_bookings ON public.bookings;
CREATE TRIGGER trg_throttle_bookings
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_intake();

DROP TRIGGER IF EXISTS trg_throttle_lead_submissions ON public.lead_submissions;
CREATE TRIGGER trg_throttle_lead_submissions
  BEFORE INSERT ON public.lead_submissions
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_intake();

DROP TRIGGER IF EXISTS trg_throttle_email_captures ON public.personal_email_captures;
CREATE TRIGGER trg_throttle_email_captures
  BEFORE INSERT ON public.personal_email_captures
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_intake();

DROP TRIGGER IF EXISTS trg_throttle_rep_applications ON public.rep_applications;
CREATE TRIGGER trg_throttle_rep_applications
  BEFORE INSERT ON public.rep_applications
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_intake();

DROP TRIGGER IF EXISTS trg_throttle_support_requests ON public.support_requests;
CREATE TRIGGER trg_throttle_support_requests
  BEFORE INSERT ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_intake();