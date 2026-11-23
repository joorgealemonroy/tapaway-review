-- Evolve the already-applied guest-review schema without rewriting its history.
-- Reviewer access is a scoped, expiring phone proof; it never creates an auth user.
CREATE TABLE public.profile_review_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, phone), UNIQUE (id, profile_id)
);
CREATE TABLE public.profile_review_challenges (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash text NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  consumed_at timestamptz,
  verification_id uuid,
  session_hash text CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  otp_consent_version integer NOT NULL CHECK (otp_consent_version = 1),
  otp_consent_text text NOT NULL,
  otp_consented_at timestamptz NOT NULL DEFAULT now(),
  user_agent text CHECK (char_length(user_agent) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_review_challenge_phone_idx ON public.profile_review_challenges (phone, created_at DESC);
CREATE INDEX profile_review_challenge_hub_idx ON public.profile_review_challenges (profile_id, created_at DESC);
CREATE TABLE public.profile_review_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  identity_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (identity_id, profile_id) REFERENCES public.profile_review_identities(id, profile_id) ON DELETE CASCADE
);
CREATE TABLE public.profile_review_otp_suppressions (
  phone text PRIMARY KEY CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  suppressed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_reviews ADD COLUMN reviewer_identity_id uuid;
ALTER TABLE public.profile_reviews ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profile_reviews ADD CONSTRAINT profile_reviews_identity_profile_fk
  FOREIGN KEY (reviewer_identity_id, profile_id) REFERENCES public.profile_review_identities(id, profile_id);
CREATE UNIQUE INDEX profile_reviews_verified_owner_idx ON public.profile_reviews(profile_id, reviewer_identity_id)
  WHERE reviewer_identity_id IS NOT NULL;
CREATE TABLE public.profile_review_writes (
  profile_id uuid NOT NULL,
  identity_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  review_id uuid NOT NULL REFERENCES public.profile_reviews(id) ON DELETE CASCADE,
  sms_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, identity_id, submission_id),
  FOREIGN KEY (identity_id, profile_id) REFERENCES public.profile_review_identities(id, profile_id) ON DELETE CASCADE
);
CREATE INDEX profile_review_writes_velocity_idx ON public.profile_review_writes (profile_id, identity_id, created_at DESC);
ALTER TABLE public.profile_review_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_review_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_review_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_review_otp_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_review_identities, public.profile_review_challenges, public.profile_review_sessions, public.profile_review_writes, public.profile_review_otp_suppressions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.profile_review_identities, public.profile_review_challenges, public.profile_review_sessions, public.profile_review_writes, public.profile_review_otp_suppressions TO service_role;

-- Retire the anonymous write route, including callers of the prior client.
CREATE OR REPLACE FUNCTION public.submit_profile_review(p_profile_id uuid,p_rating integer,p_comment text,p_visitor_id uuid,p_submission_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Verify your phone before posting a review.' USING ERRCODE='42501'; END;
$$;
REVOKE ALL ON FUNCTION public.submit_profile_review(uuid,integer,text,uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.profile_reviews_enabled(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT 1 FROM public.profile_review_settings s WHERE s.profile_id=p_profile_id AND s.enabled)
    AND public.personal_profile_is_active(p_profile_id) IS TRUE;
$$;
REVOKE ALL ON FUNCTION public.profile_reviews_enabled(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.profile_reviews_enabled(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.profile_review_otp_allowed(p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.profile_review_otp_suppressions WHERE phone=p_phone)
    AND NOT EXISTS(SELECT 1 FROM public.personal_email_captures e WHERE e.phone=p_phone AND e.sms_opt_in IS FALSE AND e.sms_opt_in_at IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM public.profile_sms_programs p WHERE p.profile_id=e.profile_id))
    AND NOT EXISTS(SELECT 1 FROM public.restaurant_sms_subscribers WHERE phone=p_phone AND sms_opt_in IS FALSE AND sms_opt_in_at IS NOT NULL);
$$;
CREATE OR REPLACE FUNCTION public.suppress_profile_review_otp(p_phone text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  INSERT INTO public.profile_review_otp_suppressions(phone) VALUES(p_phone)
    ON CONFLICT(phone) DO UPDATE SET suppressed_at=now();
$$;
REVOKE ALL ON FUNCTION public.profile_review_otp_allowed(text),public.suppress_profile_review_otp(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.profile_review_otp_allowed(text),public.suppress_profile_review_otp(text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_profile_review_challenge(
  p_profile_id uuid,p_phone text,p_challenge_id uuid,p_code_hash text,p_otp_consent boolean,p_otp_consent_version integer,p_user_agent text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE accepted timestamptz:=clock_timestamp();
BEGIN
  IF NOT public.profile_reviews_enabled(p_profile_id) THEN RAISE EXCEPTION 'Reviews are unavailable for this hub.' USING ERRCODE='22023'; END IF;
  IF p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{7,14}$' OR p_challenge_id IS NULL OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$'
    OR p_otp_consent IS DISTINCT FROM true OR p_otp_consent_version IS DISTINCT FROM 1 OR char_length(p_user_agent)>500 THEN
    RAISE EXCEPTION 'Check your phone number and verification consent.' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('review-otp-phone:'||p_phone,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('review-otp-profile:'||p_profile_id::text,0));
  IF NOT public.profile_review_otp_allowed(p_phone) THEN RAISE EXCEPTION 'Verification texts are unavailable for this number.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.profile_review_challenges WHERE phone=p_phone AND created_at>accepted-interval '60 seconds')
    OR (SELECT count(*) FROM public.profile_review_challenges WHERE phone=p_phone AND created_at>accepted-interval '1 hour')>=5
    OR (SELECT count(*) FROM public.profile_review_challenges WHERE phone=p_phone AND created_at>accepted-interval '24 hours')>=10
    OR (SELECT count(*) FROM public.profile_review_challenges WHERE profile_id=p_profile_id AND created_at>accepted-interval '1 hour')>=100
    OR (SELECT count(*) FROM public.profile_review_challenges WHERE profile_id=p_profile_id AND created_at>accepted-interval '24 hours')>=500 THEN
    RAISE EXCEPTION 'Please wait before requesting another code.' USING ERRCODE='P0001'; END IF;
  UPDATE public.profile_review_challenges SET expires_at=accepted
    WHERE profile_id=p_profile_id AND phone=p_phone AND consumed_at IS NULL AND expires_at>accepted;
  INSERT INTO public.profile_review_challenges(id,profile_id,phone,code_hash,expires_at,otp_consent_version,otp_consent_text,otp_consented_at,user_agent,created_at)
    VALUES(p_challenge_id,p_profile_id,p_phone,p_code_hash,accepted+interval '10 minutes',1,
      'By tapping Send code, I agree to receive a one-time text from TapAway to verify my phone for this review. Standard message and data rates may apply. This does not sign me up for offers.',
      accepted,p_user_agent,accepted);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_profile_review_code_sent(p_profile_id uuid,p_challenge_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  UPDATE public.profile_review_challenges SET sent_at=clock_timestamp()
    WHERE id=p_challenge_id AND profile_id=p_profile_id AND sent_at IS NULL AND consumed_at IS NULL AND expires_at>clock_timestamp();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_review_session(p_profile_id uuid,p_token_hash text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('expiresAt',s.expires_at,'maskedPhone','••• ••• '||right(i.phone,4),
    'review',(SELECT jsonb_build_object('id',r.id,'rating',r.rating,'comment',r.comment,'created_at',r.created_at,'updated_at',r.updated_at,'phone_verified',true)
      FROM public.profile_reviews r WHERE r.profile_id=p_profile_id AND r.reviewer_identity_id=i.id))
  FROM public.profile_review_sessions s JOIN public.profile_review_identities i ON i.id=s.identity_id AND i.profile_id=s.profile_id
  WHERE s.profile_id=p_profile_id AND s.token_hash=p_token_hash AND s.expires_at>now() AND public.profile_reviews_enabled(p_profile_id);
$$;

CREATE OR REPLACE FUNCTION public.verify_profile_review_challenge(
  p_profile_id uuid,p_challenge_id uuid,p_code_hash text,p_verification_id uuid,p_token_hash text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE challenge public.profile_review_challenges%ROWTYPE; identity uuid; accepted timestamptz:=clock_timestamp();
BEGIN
  IF NOT public.profile_reviews_enabled(p_profile_id) OR p_verification_id IS NULL OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$'
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  SELECT * INTO challenge FROM public.profile_review_challenges WHERE id=p_challenge_id AND profile_id=p_profile_id FOR UPDATE;
  IF NOT FOUND OR challenge.sent_at IS NULL OR challenge.expires_at<=accepted OR challenge.attempts>=5 THEN RETURN NULL; END IF;
  IF challenge.consumed_at IS NOT NULL THEN
    IF challenge.verification_id=p_verification_id AND challenge.code_hash=p_code_hash AND challenge.session_hash=p_token_hash THEN
      RETURN public.get_profile_review_session(p_profile_id,p_token_hash);
    END IF;
    RETURN NULL;
  END IF;
  IF challenge.code_hash<>p_code_hash THEN
    UPDATE public.profile_review_challenges SET attempts=attempts+1 WHERE id=challenge.id;
    RETURN NULL; -- No exception: wrong-guess counters must commit durably.
  END IF;
  INSERT INTO public.profile_review_identities(profile_id,phone,verified_at)
    VALUES(p_profile_id,challenge.phone,accepted)
    ON CONFLICT(profile_id,phone) DO UPDATE SET verified_at=EXCLUDED.verified_at RETURNING id INTO identity;
  -- Fresh verification revokes older devices. Recovered access controls the same review.
  DELETE FROM public.profile_review_sessions WHERE identity_id=identity AND profile_id=p_profile_id;
  INSERT INTO public.profile_review_sessions(token_hash,identity_id,profile_id,expires_at)
    VALUES(p_token_hash,identity,p_profile_id,accepted+interval '30 days');
  UPDATE public.profile_review_challenges SET consumed_at=accepted,verification_id=p_verification_id,session_hash=p_token_hash WHERE id=challenge.id;
  RETURN public.get_profile_review_session(p_profile_id,p_token_hash);
END;
$$;

-- A separate offers topic does not broaden existing ordering/restock permission.
ALTER TABLE public.profile_sms_contacts ADD COLUMN offers_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.profile_sms_contacts ADD COLUMN offers_consent_text text;
ALTER TABLE public.profile_sms_contacts ADD COLUMN offers_consent_at timestamptz;
ALTER TABLE public.profile_sms_contacts ADD COLUMN offers_consent_version integer;
ALTER TABLE public.profile_sms_consent_events ADD COLUMN consent_terms_url text;
ALTER TABLE public.profile_sms_consent_events ADD COLUMN consent_privacy_url text;
ALTER TABLE public.profile_sms_consent_events DROP CONSTRAINT profile_sms_consent_events_topic_check;
ALTER TABLE public.profile_sms_consent_events ADD CONSTRAINT profile_sms_consent_events_topic_check CHECK(topic IN ('restock','ordering','offers','all'));
ALTER TABLE public.sms_campaigns DROP CONSTRAINT sms_campaigns_campaign_type_check;
ALTER TABLE public.sms_campaigns ADD CONSTRAINT sms_campaigns_campaign_type_check CHECK(campaign_type IS NULL OR campaign_type IN ('restock','ordering','offers'));

CREATE OR REPLACE FUNCTION public.profile_sms_consent_text(p_profile_id uuid,p_topic text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_topic='offers' THEN 'I agree to receive recurring automated texts with updates and offers from '||p.brand_name||
   '. Optional; not required to review or buy. '||p.frequency_text||' Standard message and data rates may apply. Reply STOP to opt out or HELP for help.' ELSE
   'I agree to receive recurring automated marketing text messages from '||p.brand_name||' about '||
   CASE p_topic WHEN 'restock' THEN 'restocks at the locations I select' WHEN 'ordering' THEN 'weekly meal ordering and menu updates' ELSE 'meal updates and special offers' END||
   '. '||p.frequency_text||' Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Terms: '||p.terms_url||'. Privacy: '||p.privacy_url||'.' END
 FROM public.profile_sms_programs p WHERE p.profile_id=p_profile_id AND p_topic IN ('restock','ordering','offers');
$$;

CREATE OR REPLACE FUNCTION public.get_profile_review_config(p_profile_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('enabled',public.profile_reviews_enabled(p_profile_id),'phoneVerification',true,
   'otpConsentVersion',1,'otpConsentText','By tapping Send code, I agree to receive a one-time text from TapAway to verify my phone for this review. Standard message and data rates may apply. This does not sign me up for offers.',
   'sms',CASE WHEN public.profile_reviews_enabled(p_profile_id) THEN (SELECT jsonb_build_object(
     'available',p.terms_url<>'' AND p.privacy_url<>'','brandName',p.brand_name,'consentVersion',p.consent_version,
     'consentText',public.profile_sms_consent_text(p_profile_id,'offers'),'termsUrl',p.terms_url,'privacyUrl',p.privacy_url,'frequencyText',p.frequency_text)
     FROM public.profile_sms_programs p WHERE p.profile_id=p_profile_id) ELSE NULL END);
$$;

CREATE OR REPLACE FUNCTION public.record_profile_review_offers_opt_in(p_profile_id uuid,p_phone text,p_consent_version integer,p_review_id uuid,p_user_agent text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE program public.profile_sms_programs%ROWTYPE; contact public.profile_sms_contacts%ROWTYPE; capture uuid; consent text; accepted timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO program FROM public.profile_sms_programs WHERE profile_id=p_profile_id;
  IF NOT FOUND OR program.terms_url='' OR program.privacy_url='' THEN RETURN 'unavailable'; END IF;
  IF p_consent_version IS DISTINCT FROM program.consent_version THEN RETURN 'consent_changed'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text||':'||p_phone,0));
  SELECT * INTO contact FROM public.profile_sms_contacts WHERE profile_id=p_profile_id AND phone=p_phone FOR UPDATE;
  -- Review verification/editing never overrides a previous STOP.
  IF contact.id IS NOT NULL AND contact.opted_out_at IS NOT NULL THEN RETURN 'suppressed'; END IF;
  IF contact.id IS NOT NULL AND contact.offers_opt_in AND contact.offers_consent_version=program.consent_version
    AND EXISTS(SELECT 1 FROM public.personal_email_captures WHERE id=contact.capture_id AND profile_id=p_profile_id AND phone=p_phone AND sms_opt_in AND sms_marketing_opt_in) THEN RETURN 'already_subscribed'; END IF;
  consent:=public.profile_sms_consent_text(p_profile_id,'offers');
  IF contact.id IS NULL THEN
    INSERT INTO public.personal_email_captures(profile_id,phone,sms_opt_in,sms_opt_in_at,sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in)
      VALUES(p_profile_id,p_phone,true,accepted,true,accepted,false) RETURNING id INTO capture;
    INSERT INTO public.profile_sms_contacts(profile_id,capture_id,phone) VALUES(p_profile_id,capture,p_phone) RETURNING * INTO contact;
  ELSE
    UPDATE public.personal_email_captures SET sms_opt_in=true,sms_opt_in_at=accepted,sms_marketing_opt_in=true,sms_marketing_opt_in_at=accepted
      WHERE id=contact.capture_id AND profile_id=p_profile_id AND phone=p_phone;
    IF NOT FOUND THEN RETURN 'unavailable'; END IF;
  END IF;
  UPDATE public.profile_sms_contacts SET offers_opt_in=true,offers_consent_text=consent,offers_consent_at=accepted,
    offers_consent_version=program.consent_version,updated_at=accepted WHERE id=contact.id;
  INSERT INTO public.profile_sms_consent_events(profile_id,contact_id,topic,action,consent_text,consent_version,source,user_agent,consent_terms_url,consent_privacy_url)
    VALUES(p_profile_id,contact.id,'offers','opt_in',consent,program.consent_version,'verified-review:'||p_review_id::text,p_user_agent,program.terms_url,program.privacy_url);
  RETURN 'subscribed';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_verified_profile_review(
  p_profile_id uuid,p_token_hash text,p_rating integer,p_comment text,p_submission_id uuid,p_request_hash text,
  p_marketing_consent boolean,p_consent_version integer,p_user_agent text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE identity public.profile_review_identities%ROWTYPE; prior public.profile_review_writes%ROWTYPE; saved public.profile_reviews%ROWTYPE;
  feedback text; sms_status text:='not_requested'; accepted timestamptz:=clock_timestamp();
BEGIN
  IF NOT public.profile_reviews_enabled(p_profile_id) THEN RAISE EXCEPTION 'Reviews are unavailable for this hub.' USING ERRCODE='22023'; END IF;
  SELECT i.* INTO identity FROM public.profile_review_identities i JOIN public.profile_review_sessions s ON s.identity_id=i.id AND s.profile_id=i.profile_id
    WHERE s.profile_id=p_profile_id AND s.token_hash=p_token_hash AND s.expires_at>accepted FOR SHARE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verify your phone again to manage your review.' USING ERRCODE='28000'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR char_length(p_comment)>600 OR p_submission_id IS NULL
    OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR char_length(p_user_agent)>500 THEN
    RAISE EXCEPTION 'Choose 1 to 5 stars and keep feedback to 600 characters.' USING ERRCODE='22023'; END IF;
  feedback:=nullif(regexp_replace(coalesce(p_comment,''),'^[[:space:]]+|[[:space:]]+$','','g'),'');
  PERFORM pg_advisory_xact_lock(hashtextextended('profile_reviews:'||p_profile_id::text,0));
  SELECT * INTO prior FROM public.profile_review_writes WHERE profile_id=p_profile_id AND identity_id=identity.id AND submission_id=p_submission_id;
  IF FOUND THEN
    IF prior.request_hash<>p_request_hash THEN RAISE EXCEPTION 'Refresh the review form before trying again.' USING ERRCODE='22023'; END IF;
    RETURN jsonb_build_object('review',(public.get_profile_review_session(p_profile_id,p_token_hash))->'review','smsStatus',prior.sms_status);
  END IF;
  IF (SELECT count(*) FROM public.profile_review_writes WHERE profile_id=p_profile_id AND identity_id=identity.id AND created_at>accepted-interval '1 hour')>=20 THEN
    RAISE EXCEPTION 'Please wait before changing your review again.' USING ERRCODE='P0001'; END IF;
  SELECT * INTO saved FROM public.profile_reviews WHERE profile_id=p_profile_id AND reviewer_identity_id=identity.id FOR UPDATE;
  IF NOT FOUND THEN
    IF (SELECT count(*) FROM public.profile_reviews WHERE profile_id=p_profile_id AND created_at>accepted-interval '10 minutes')>=30
      OR (SELECT count(*) FROM public.profile_reviews WHERE profile_id=p_profile_id AND created_at>accepted-interval '24 hours')>=300 THEN
      RAISE EXCEPTION 'Reviews are busy right now. Please try again later.' USING ERRCODE='P0001'; END IF;
    INSERT INTO public.profile_reviews(profile_id,rating,comment,visitor_id,submission_id,reviewer_identity_id,created_at,updated_at)
      VALUES(p_profile_id,p_rating,feedback,identity.id,p_submission_id,identity.id,accepted,accepted) RETURNING * INTO saved;
  ELSE
    UPDATE public.profile_reviews SET rating=p_rating,comment=feedback,updated_at=accepted WHERE id=saved.id RETURNING * INTO saved;
  END IF;
  IF p_marketing_consent IS TRUE THEN
    BEGIN
      sms_status:=public.record_profile_review_offers_opt_in(p_profile_id,identity.phone,p_consent_version,saved.id,p_user_agent);
    EXCEPTION WHEN OTHERS THEN
      sms_status:='unavailable'; -- Optional signup failures never discard a saved review.
    END;
  END IF;
  INSERT INTO public.profile_review_writes(profile_id,identity_id,submission_id,request_hash,review_id,sms_status)
    VALUES(p_profile_id,identity.id,p_submission_id,p_request_hash,saved.id,sms_status);
  RETURN jsonb_build_object('review',jsonb_build_object('id',saved.id,'rating',saved.rating,'comment',saved.comment,'created_at',saved.created_at,'updated_at',saved.updated_at,'phone_verified',true),'smsStatus',sms_status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_review_challenge(uuid,text,uuid,text,boolean,integer,text),
  public.mark_profile_review_code_sent(uuid,uuid), public.get_profile_review_session(uuid,text),
  public.verify_profile_review_challenge(uuid,uuid,text,uuid,text), public.get_profile_review_config(uuid),
  public.record_profile_review_offers_opt_in(uuid,text,integer,uuid,text),
  public.save_verified_profile_review(uuid,text,integer,text,uuid,text,boolean,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_review_challenge(uuid,text,uuid,text,boolean,integer,text),
  public.mark_profile_review_code_sent(uuid,uuid), public.get_profile_review_session(uuid,text),
  public.verify_profile_review_challenge(uuid,uuid,text,uuid,text), public.get_profile_review_config(uuid),
  public.record_profile_review_offers_opt_in(uuid,text,integer,uuid,text),
  public.save_verified_profile_review(uuid,text,integer,text,uuid,text,boolean,integer,text) TO service_role;


-- Existing sends and STOP handling include offers without changing earlier topics.
CREATE OR REPLACE FUNCTION public.get_profile_location_sms_recipients(p_profile_id uuid,p_campaign_type text,p_location_id uuid DEFAULT NULL)
RETURNS TABLE(phone text,capture_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_campaign_type NOT IN ('restock','ordering','offers') OR p_campaign_type IS NULL OR (p_campaign_type IN ('ordering','offers') AND p_location_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Choose a valid text audience' USING ERRCODE='22023'; END IF;
  IF p_location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profile_locations l WHERE l.id=p_location_id AND l.profile_id=p_profile_id AND l.is_active AND NOT l.is_placeholder) THEN
    RAISE EXCEPTION 'This location is unavailable' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT c.phone,c.capture_id FROM public.profile_sms_contacts c
    JOIN public.profile_sms_programs p ON p.profile_id=c.profile_id
    JOIN public.personal_email_captures e ON e.id=c.capture_id AND e.profile_id=c.profile_id AND e.phone=c.phone
    WHERE c.profile_id=p_profile_id AND c.opted_out_at IS NULL AND e.sms_opt_in IS TRUE AND e.sms_marketing_opt_in IS TRUE
    AND ((p_campaign_type='ordering' AND c.ordering_opt_in AND c.ordering_consent_version=p.consent_version)
      OR (p_campaign_type='offers' AND c.offers_opt_in AND c.offers_consent_version=p.consent_version)
      OR (p_campaign_type='restock' AND EXISTS(SELECT 1 FROM public.profile_location_subscriptions s
        JOIN public.profile_locations l ON l.id=s.location_id AND l.profile_id=s.profile_id
        WHERE s.contact_id=c.id AND s.profile_id=c.profile_id AND s.revoked_at IS NULL AND s.consent_version=p.consent_version
          AND l.is_active AND NOT l.is_placeholder AND (p_location_id IS NULL OR s.location_id=p_location_id))))
    ORDER BY c.phone;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_profile_location_sms(p_sender_number text,p_phone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_profile uuid; contact public.profile_sms_contacts%ROWTYPE; revoked timestamptz:=now();
BEGIN
  SELECT profile_id INTO target_profile FROM public.profile_sms_programs WHERE sender_number=p_sender_number;
  IF target_profile IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_profile::text||':'||p_phone,0));
  SELECT * INTO contact FROM public.profile_sms_contacts WHERE profile_id=target_profile AND phone=p_phone FOR UPDATE;
  IF contact.id IS NOT NULL THEN
    UPDATE public.profile_sms_contacts SET opted_out_at=revoked,ordering_opt_in=false,offers_opt_in=false,updated_at=revoked WHERE id=contact.id;
    UPDATE public.profile_location_subscriptions SET revoked_at=revoked WHERE contact_id=contact.id AND revoked_at IS NULL;
    UPDATE public.personal_email_captures SET sms_opt_in=false,sms_marketing_opt_in=false,sms_transactional_opt_in=false WHERE id=contact.capture_id;
    INSERT INTO public.profile_sms_consent_events(profile_id,contact_id,topic,action,source)
    VALUES(target_profile,contact.id,'all','opt_out','verified-twilio-stop');
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_legacy_shared_sms(p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE personal_count integer; restaurant_count integer;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{6,14}$' THEN RAISE EXCEPTION 'Invalid phone' USING ERRCODE='22023'; END IF;
  UPDATE public.personal_email_captures e SET sms_opt_in=false WHERE e.phone=p_phone
    AND NOT EXISTS(SELECT 1 FROM public.profile_sms_programs p WHERE p.profile_id=e.profile_id);
  GET DIAGNOSTICS personal_count=ROW_COUNT;
  UPDATE public.restaurant_sms_subscribers SET sms_opt_in=false WHERE phone=p_phone;
  GET DIAGNOSTICS restaurant_count=ROW_COUNT;
  RETURN jsonb_build_object('personal_count',personal_count,'restaurant_count',restaurant_count);
END $$;

CREATE OR REPLACE FUNCTION public.get_profile_sms_dashboard(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE program public.profile_sms_programs%ROWTYPE; result jsonb;
BEGIN
  IF NOT public.can_manage_profile_locations(p_profile_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO program FROM public.profile_sms_programs WHERE profile_id=p_profile_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'program',jsonb_build_object('brand_name',program.brand_name,'frequency_text',program.frequency_text,'terms_url',program.terms_url,
      'privacy_url',program.privacy_url,'consent_version',program.consent_version,'sender_status',program.sender_status,'sender_ready',program.sender_status='ready','offers_consent_text',public.profile_sms_consent_text(p_profile_id,'offers')),
    'audience',jsonb_build_object(
      'total',(SELECT count(*) FROM (SELECT phone FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',NULL) UNION SELECT phone FROM public.get_profile_location_sms_recipients(p_profile_id,'ordering',NULL) UNION SELECT phone FROM public.get_profile_location_sms_recipients(p_profile_id,'offers',NULL)) q),
      'restock',(SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',NULL)),
      'ordering',(SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'ordering',NULL)),
      'offers',(SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'offers',NULL))),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'subscriber_count',
      CASE WHEN l.is_active AND NOT l.is_placeholder THEN (SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',l.id)) ELSE 0 END)
      ORDER BY l.sort_order,l.created_at) FROM public.profile_locations l WHERE l.profile_id=p_profile_id),'[]'::jsonb),
    'campaigns',COALESCE((SELECT jsonb_agg(q ORDER BY q.created_at DESC) FROM (SELECT c.id,c.message,c.recipient_count,c.success_count,c.failure_count,c.created_at,c.campaign_type,c.location_id
      FROM public.sms_campaigns c WHERE c.profile_id=p_profile_id ORDER BY c.created_at DESC LIMIT 20) q),'[]'::jsonb)) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_profile_reviews(
  p_profile_id uuid,
  p_limit integer DEFAULT 5,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_total bigint;
  v_average numeric;
  v_reviews jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_review_settings s
    WHERE s.profile_id = p_profile_id AND s.enabled
  ) OR public.personal_profile_is_active(p_profile_id) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'enabled', false, 'total', 0, 'average', NULL,
      'reviews', '[]'::jsonb, 'has_more', false
    );
  END IF;

  SELECT count(*), round(avg(r.rating), 1)
    INTO v_total, v_average
  FROM public.profile_reviews r WHERE r.profile_id = p_profile_id;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', page.id, 'rating', page.rating,
      'comment', page.comment, 'created_at', page.created_at,
      'updated_at',page.updated_at,'phone_verified',page.reviewer_identity_id IS NOT NULL
    ) ORDER BY page.created_at DESC, page.id DESC
  ), '[]'::jsonb) INTO v_reviews
  FROM (
    SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at, r.reviewer_identity_id
    FROM public.profile_reviews r
    WHERE r.profile_id = p_profile_id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_limit OFFSET v_offset
  ) page;

  RETURN jsonb_build_object(
    'enabled', true, 'total', v_total, 'average', v_average,
    'reviews', v_reviews,
    'has_more', v_total > v_offset + jsonb_array_length(v_reviews)
  );
END;
$$;
