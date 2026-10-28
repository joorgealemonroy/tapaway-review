-- A targeted payment request is an explicit admin action. This migration does
-- not pause or reclassify any existing account.
ALTER TABLE public.personal_profiles DROP CONSTRAINT IF EXISTS personal_profiles_payment_state_check;
ALTER TABLE public.personal_profiles ADD CONSTRAINT personal_profiles_payment_state_check CHECK (
  payment_state IN ('paying','complimentary','trialing','past_due','canceled','none','unknown_manual','payment_required')
);

CREATE TABLE IF NOT EXISTS public.hub_payment_requests (
  profile_id uuid PRIMARY KEY REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  request_version uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz,
  amount integer NOT NULL DEFAULT 2000 CHECK (amount=2000),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency='usd'),
  card_quantity integer NOT NULL DEFAULT 4 CHECK (card_quantity=4),
  checkout_attempt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  checkout_attempt_created_at timestamptz,
  checkout_started_at timestamptz,
  checkout_session_expires_at timestamptz,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  payment_hold_at timestamptz,
  payment_hold_reason text CHECK (payment_hold_reason IN ('refunded','disputed')),
  payment_hold_event_id text,
  welcome_email_started_at timestamptz,
  welcome_email_sent_at timestamptz
);
ALTER TABLE public.hub_payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_payment_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.hub_payment_requests TO service_role;

CREATE OR REPLACE FUNCTION public.hub_access_allowed(_status text,_approved boolean,_payment text,_trial_end timestamptz,_created timestamptz,_subscription text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT COALESCE(_payment,'')<>'payment_required' AND _approved IS TRUE AND (
   (_payment='complimentary') OR _status='active' OR
   (_status='trialing' AND (
     (_subscription IS NOT NULL AND COALESCE(_trial_end,_created+interval '14 days')>now())
     OR (_subscription IS NULL AND _created<=timestamptz '2026-10-21 03:34:37+00')
   )));
$$;

-- Booking availability must honor the same explicit pause as hub links.
CREATE OR REPLACE FUNCTION public.creator_booking_is_public(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.personal_profiles p WHERE p.id=_profile_id
   AND p.subscription_status='active'
   AND public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id));
$$;

CREATE OR REPLACE FUNCTION public.require_hub_payment(_profile_id uuid,_requested_by uuid)
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
  IF p.stripe_subscription_id IS NOT NULL OR p.subscription_status IN ('active','past_due')
      OR p.payment_state IN ('paying','complimentary') THEN
    RAISE EXCEPTION 'Paid, linked or complimentary accounts cannot be paused with this action' USING ERRCODE='22023';
  END IF;
  SELECT * INTO r FROM public.hub_payment_requests WHERE profile_id=_profile_id FOR UPDATE;
  IF FOUND AND r.fulfilled_at IS NULL AND p.payment_state='payment_required' THEN
    RETURN r.request_version;
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
REVOKE ALL ON FUNCTION public.require_hub_payment(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.require_hub_payment(uuid,uuid) TO service_role;

-- Only a verified Stripe handler calls this function. Session binding and row
-- locks ensure a stale checkout, replay or competing request cannot replace
-- billing or transfer ownership. Stripe payment verification stays in the edge
-- handler; no browser role has execution permission here.
CREATE OR REPLACE FUNCTION public.fulfill_hub_payment(_profile_id uuid,_request_version uuid,_session_id text,_subscription_id text,_customer_id text,_billing_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.personal_profiles%ROWTYPE; r public.hub_payment_requests%ROWTYPE;
BEGIN
  IF _session_id IS NULL OR _session_id !~ '^cs_[A-Za-z0-9_]+$' OR _subscription_id IS NULL OR _subscription_id !~ '^sub_[A-Za-z0-9]+$'
      OR _customer_id IS NULL OR _customer_id !~ '^cus_[A-Za-z0-9]+$'
      OR _billing_email IS NULL OR length(_billing_email)>320 OR _billing_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid verified payment details' USING ERRCODE='22023';
  END IF;
  SELECT * INTO p FROM public.personal_profiles WHERE id=_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hub not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO r FROM public.hub_payment_requests WHERE profile_id=_profile_id FOR UPDATE;
  IF NOT FOUND OR r.request_version IS DISTINCT FROM _request_version
      OR r.stripe_checkout_session_id IS DISTINCT FROM _session_id THEN
    RAISE EXCEPTION 'Payment request does not match this checkout' USING ERRCODE='22023';
  END IF;
  IF r.payment_hold_at IS NOT NULL THEN
    RAISE EXCEPTION 'This payment requires admin review before activation' USING ERRCODE='22023';
  END IF;
  IF r.fulfilled_at IS NOT NULL THEN
    IF r.stripe_subscription_id IS DISTINCT FROM _subscription_id OR p.stripe_subscription_id IS DISTINCT FROM _subscription_id THEN
      RAISE EXCEPTION 'Payment request was fulfilled by another subscription' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('activated',true,'alreadyFulfilled',true);
  END IF;
  IF p.payment_state IS DISTINCT FROM 'payment_required' OR p.is_approved IS DISTINCT FROM true
      OR (p.stripe_subscription_id IS NOT NULL AND p.stripe_subscription_id<>_subscription_id) THEN
    RAISE EXCEPTION 'This hub requires an admin review before activation' USING ERRCODE='22023';
  END IF;
  UPDATE public.personal_profiles SET payment_state='paying',subscription_status='active',
    stripe_subscription_id=_subscription_id,stripe_customer_id=_customer_id,
    stripe_billing_email=lower(trim(_billing_email)),trial_ends_at=NULL,updated_at=now()
    WHERE id=_profile_id;
  UPDATE public.hub_payment_requests SET fulfilled_at=now(),stripe_subscription_id=_subscription_id
    WHERE profile_id=_profile_id AND request_version=_request_version;
  RETURN jsonb_build_object('activated',true,'alreadyFulfilled',false);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_hub_payment(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_hub_payment(uuid,uuid,text,text,text,text) TO service_role;

-- Refunds and disputes do not necessarily cancel a Stripe subscription. Keep a
-- separate durable hold so a later invoice or old paid checkout cannot undo it.
CREATE OR REPLACE FUNCTION public.hold_hub_payment_by_subscription(_subscription_id text,_reason text,_event_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE profile uuid; p public.personal_profiles%ROWTYPE; r public.hub_payment_requests%ROWTYPE;
BEGIN
  IF _reason NOT IN ('refunded','disputed') OR _reason IS NULL OR _event_id IS NULL OR _event_id !~ '^evt_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid verified payment hold' USING ERRCODE='22023';
  END IF;
  SELECT profile_id INTO profile FROM public.hub_payment_requests
    WHERE stripe_subscription_id=_subscription_id AND fulfilled_at IS NOT NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Same lock order as fulfillment to avoid a hold/activation deadlock.
  SELECT * INTO p FROM public.personal_profiles WHERE id=profile FOR UPDATE;
  SELECT * INTO r FROM public.hub_payment_requests WHERE profile_id=profile FOR UPDATE;
  IF r.fulfilled_at IS NULL OR r.stripe_subscription_id IS DISTINCT FROM _subscription_id
      OR p.stripe_subscription_id IS DISTINCT FROM _subscription_id THEN RETURN false; END IF;
  IF r.payment_hold_at IS NULL THEN
    UPDATE public.hub_payment_requests SET payment_hold_at=now(),payment_hold_reason=_reason,payment_hold_event_id=_event_id
      WHERE profile_id=profile;
  END IF;
  UPDATE public.personal_profiles SET payment_state='payment_required',updated_at=now() WHERE id=profile;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hold_hub_payment_by_subscription(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_hub_payment_by_subscription(text,text,text) TO service_role;

-- Public presentation is deliberately built from allowlisted branding and
-- aggregate counts. No email, account owner, visitor, IP or session data leaves
-- this service-only function. The public endpoint only exposes pending offers.
CREATE OR REPLACE FUNCTION public.get_hub_payment_offer(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH target AS (
   SELECT p.*,r.request_version,r.requested_at,r.amount,r.currency,r.card_quantity
   FROM public.personal_profiles p JOIN public.hub_payment_requests r ON r.profile_id=p.id
   WHERE lower(p.username)=lower(trim(_slug)) AND p.payment_state='payment_required'
     AND r.fulfilled_at IS NULL AND p.is_approved IS TRUE
   LIMIT 1
 ), hits AS (
   SELECT h.event_name,h.occurred_at,
     lower(COALESCE(NULLIF(h.props->>'link_type',''),l.link_type,'')) AS link_type,
     lower(COALESCE(NULLIF(h.props->>'link_url',''),l.url,'')) AS link_url
   FROM public.analytics_hits h JOIN target t ON t.id=h.hub_id
   LEFT JOIN public.personal_links l ON l.profile_id=t.id AND l.id::text=h.props->>'link_id'
   WHERE h.is_validated IS TRUE AND h.traffic_class='human'
 ), metrics AS (
   SELECT count(*) FILTER(WHERE event_name='hub_view') AS views,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')) AS link_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click') AND (
       link_type='google_review' OR (link_type<>'directions' AND link_url~'(^https?://([^/]+\.)?google\.com/.*writereview|^https?://([^/]+\.)?g\.page/.*review)'))) AS google_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click','social_click') AND (link_type='yelp' OR link_url~'^https?://([^/]+\.)?yelp\.com/')) AS yelp_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','social_click') AND (link_type='instagram' OR link_url~'^https?://([^/]+\.)?instagram\.com/')) AS instagram_clicks,
     count(*) FILTER(WHERE event_name='directions_click' OR (event_name='link_click' AND link_type='directions')) AS directions_clicks,
     count(*) FILTER(WHERE event_name='contact_save') AS contact_saves,
     min(occurred_at) AS first_activity_at,max(occurred_at) AS last_activity_at
   FROM hits
 ), history AS (
   SELECT count(*) AS historical_views
   FROM public.personal_analytics a JOIN target t ON t.id=a.profile_id
   WHERE a.event_type='profile_visit'
     AND a.created_at < COALESCE((SELECT min(h.occurred_at) FROM public.analytics_hits h WHERE h.hub_id=t.id),'infinity'::timestamptz)
     AND COALESCE(a.visitor_info->>'userAgent',a.visitor_info->>'user_agent','')<>''
     AND COALESCE(a.visitor_info->>'userAgent',a.visitor_info->>'user_agent','') !~* 'bot|crawl|spider|slurp|preview|facebookexternalhit|headless|phantomjs|puppeteer|playwright|python-requests|curl/|wget|monitor|uptime|lighthouse|gtmetrix'
     AND COALESCE(a.visitor_info->>'referrer','') !~* 'localhost|127\.0\.0\.1|lovable\.(app|dev)|admin_preview'
 )
 SELECT jsonb_build_object(
   'profileId',t.id,'requestVersion',t.request_version,'username',t.username,
   'displayName',COALESCE(NULLIF(trim(t.full_name),''),NULLIF(trim(t.contact_company),''),t.username),
   'profilePhotoUrl',t.profile_photo_url,'headerImageUrl',t.header_image_url,
   'amount',t.amount,'currency',t.currency,'cardQuantity',t.card_quantity,'interval','month','requestedAt',t.requested_at,
   'metrics',jsonb_build_object('views',m.views,'linkClicks',m.link_clicks,'googleClicks',m.google_clicks,
     'yelpClicks',m.yelp_clicks,'instagramClicks',m.instagram_clicks,'directionsClicks',m.directions_clicks,
     'contactSaves',m.contact_saves,'firstActivityAt',m.first_activity_at,'lastActivityAt',m.last_activity_at,
     'source','validated_traffic','historicalViews',h.historical_views)
 ) FROM target t CROSS JOIN metrics m CROSS JOIN history h;
$$;
REVOKE ALL ON FUNCTION public.get_hub_payment_offer(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_hub_payment_offer(text) TO service_role;
