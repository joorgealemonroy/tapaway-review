-- Keep every public projection consistent with the existing hub entitlement.
-- No customer subscription, gift, content, or legacy price is changed here.
CREATE OR REPLACE VIEW public.personal_profiles_public WITH (security_invoker=false) AS
SELECT id,username,full_name,bio,headline,profile_photo_url,header_type,header_color,
  header_image_url,background_color,pfp_position,plan_type,subscription_status
FROM public.personal_profiles p
WHERE p.subscription_status='active'
  AND public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id);
REVOKE ALL ON public.personal_profiles_public FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.personal_profiles_public TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_public_personal_showcase(_limit integer DEFAULT 6)
RETURNS TABLE(id uuid,username text,full_name text,headline text,profile_photo_url text,header_type text,header_color text,background_color text,plan_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.username,p.full_name,p.headline,p.profile_photo_url,p.header_type,p.header_color,p.background_color,p.plan_type
 FROM public.personal_profiles p WHERE p.subscription_status='active'
   AND public.hub_access_allowed(p.subscription_status,p.is_approved,p.payment_state,p.trial_ends_at,p.created_at,p.stripe_subscription_id)
   AND p.profile_photo_url IS NOT NULL AND p.username NOT IN ('lovie','tapjorge','tapaway')
 ORDER BY p.created_at DESC LIMIT GREATEST(1,LEAST(COALESCE(_limit,6),24));
$$;

CREATE OR REPLACE FUNCTION public.get_public_creator_products(_creator_id uuid)
RETURNS TABLE(id uuid,creator_id uuid,title text,description text,price_cents integer,product_type text,cover_image_url text,is_active boolean,created_at timestamptz,updated_at timestamptz,image_urls text[],long_description text,duration_minutes integer,booking_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT cp.id,cp.creator_id,cp.title,cp.description,cp.price_cents,cp.product_type,cp.cover_image_url,cp.is_active,
   cp.created_at,cp.updated_at,cp.image_urls,cp.long_description,cp.duration_minutes,cp.booking_url
 FROM public.creator_products cp JOIN public.personal_profiles p ON p.id=cp.creator_id
 WHERE cp.is_active IS TRUE AND cp.creator_id=_creator_id
   AND (public.personal_profile_is_active(p.id) OR public.is_admin() OR p.user_id=auth.uid())
 ORDER BY cp.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_restaurant_menu(_restaurant_id uuid)
RETURNS TABLE(id uuid,restaurant_id uuid,name text,sort_order integer,items jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.restaurant_id,s.name,s.sort_order,
   COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order) FROM public.menu_items i WHERE i.section_id=s.id),'[]'::jsonb)
 FROM public.menu_sections s JOIN public.restaurants r ON r.id=s.restaurant_id
 WHERE s.restaurant_id=_restaurant_id AND (
   public.hub_access_allowed(r.subscription_status,r.is_approved,r.payment_state,r.trial_ends_at,r.created_at,r.stripe_subscription_id)
   OR public.is_admin() OR r.owner_id=auth.uid())
 ORDER BY s.sort_order;
$$;

-- Customer card requests must pass the existing paid-order or allowance server
-- workflow. Browser inserts cannot choose their own paid status or quantity.
DROP POLICY IF EXISTS "Users can insert own card requests" ON public.personal_card_requests;
REVOKE INSERT ON public.personal_card_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.personal_card_requests TO service_role;

-- Reset tokens are capabilities and are never read by browser code.
REVOKE ALL ON public.magic_link_tokens,public.rep_setup_tokens FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.magic_link_tokens,public.rep_setup_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.guard_nfc_card_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE field text;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  FOREACH field IN ARRAY ARRAY['id','public_code','claim_code_hash','status','owner_user_id','destination_type','claimed_at','created_at','batch_id','card_type','paid_order_ref'] LOOP
    IF to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN
      RAISE EXCEPTION 'Card ownership, claims and billing are managed by TapAway' USING ERRCODE='42501';
    END IF;
  END LOOP;
  IF NEW.destination_value IS DISTINCT FROM OLD.destination_value AND OLD.destination_type='profile'
    AND NOT EXISTS(SELECT 1 FROM public.personal_profiles p WHERE p.user_id=auth.uid() AND p.username=NEW.destination_value) THEN
    RAISE EXCEPTION 'A profile card must point to your own hub' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_nfc_card_authority ON public.nfc_cards;
CREATE TRIGGER guard_nfc_card_authority BEFORE UPDATE ON public.nfc_cards FOR EACH ROW EXECUTE FUNCTION public.guard_nfc_card_authority();

-- Match public media bucket limits to the current upload UI. Existing files are
-- unchanged. Personal photos also contain the supported short collage videos.
UPDATE storage.buckets SET file_size_limit=20971520,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']
  WHERE id='personal-photos';
UPDATE storage.buckets SET file_size_limit=20971520,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
  WHERE id='personal-link-images';
UPDATE storage.buckets SET file_size_limit=20971520,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png','image/webp']
  WHERE id='card-print-files';

-- Reservations are created by the checkout server, never by browser writes.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reservation_key uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reserved_until timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price_cents integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes integer;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_reservation_key_unique ON public.bookings(reservation_key) WHERE reservation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_creator_window ON public.bookings(creator_id,booking_date,start_time);
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
REVOKE INSERT ON public.bookings FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.bookings TO service_role;

CREATE OR REPLACE FUNCTION public.guard_booking_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at')
      OR (NEW.status IS DISTINCT FROM OLD.status AND (NEW.status IS NULL OR NEW.status NOT IN ('canceled','cancelled'))) THEN
    RAISE EXCEPTION 'Booking details and payment confirmation are managed by TapAway' USING ERRCODE='42501';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_booking_authority ON public.bookings;
CREATE TRIGGER guard_booking_authority BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_booking_authority();

-- Safe legacy slot projection: no booking id, buyer email or payment tokens.
CREATE OR REPLACE VIEW public.bookings_public WITH (security_invoker=false) AS
SELECT b.product_id,b.booking_date,b.start_time,b.status,b.timezone,b.created_at
FROM public.bookings b
WHERE public.creator_booking_is_public(b.creator_id)
  AND (b.status='paid' OR (b.status='pending' AND COALESCE(b.reserved_until,b.created_at+interval '15 minutes')>now()));
REVOKE ALL ON public.bookings_public FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bookings_public TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.reserve_creator_booking(_product_id uuid,_buyer_email text,_booking_date date,_start_time time,_timezone text,_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE product public.creator_products%ROWTYPE; avail public.creator_availability%ROWTYPE;
  existing public.bookings%ROWTYPE; start_at timestamptz; finish_at timestamptz; booking_id uuid; expires_at timestamptz;
BEGIN
  IF _request_key IS NULL OR _product_id IS NULL OR _booking_date IS NULL OR _start_time IS NULL
      OR _buyer_email IS NULL OR length(_buyer_email)>254 OR _buyer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid booking request' USING ERRCODE='22023';
  END IF;
  SELECT * INTO product FROM public.creator_products WHERE id=_product_id FOR SHARE;
  IF NOT FOUND OR product.is_active IS DISTINCT FROM true OR product.product_type IS DISTINCT FROM 'booking'
      OR product.price_cents IS NULL OR product.price_cents<50 OR product.price_cents>99999999
      OR product.duration_minutes IS NULL OR product.duration_minutes NOT BETWEEN 1 AND 480
      OR NOT public.creator_booking_is_public(product.creator_id) THEN
    RAISE EXCEPTION 'This booking is not available' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('creator-booking:'||product.creator_id::text,0));
  SELECT * INTO existing FROM public.bookings WHERE reservation_key=_request_key FOR UPDATE;
  IF FOUND THEN
    IF existing.product_id IS DISTINCT FROM _product_id OR lower(trim(existing.buyer_email)) IS DISTINCT FROM lower(trim(_buyer_email))
        OR existing.booking_date IS DISTINCT FROM _booking_date OR existing.start_time IS DISTINCT FROM _start_time
        OR existing.timezone IS DISTINCT FROM _timezone THEN
      RAISE EXCEPTION 'Reservation does not match this request' USING ERRCODE='22023';
    END IF;
    IF existing.status IS DISTINCT FROM 'pending' OR existing.reserved_until IS NULL OR existing.reserved_until<=now() THEN
      RAISE EXCEPTION 'This reservation is no longer pending' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('bookingId',existing.id,'creatorId',existing.creator_id,'expiresAt',existing.reserved_until,
      'priceCents',existing.price_cents,'durationMinutes',existing.duration_minutes,'stripeSessionId',existing.stripe_session_id);
  END IF;
  SELECT * INTO avail FROM public.creator_availability WHERE creator_id=product.creator_id AND day_of_week=extract(dow FROM _booking_date)::integer FOR SHARE;
  IF NOT FOUND OR _timezone IS DISTINCT FROM avail.timezone OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=avail.timezone)
      OR _start_time<avail.start_time OR (_booking_date+_start_time+make_interval(mins=>product.duration_minutes))>(_booking_date+avail.end_time)
      OR mod(extract(epoch FROM (_start_time-avail.start_time)),product.duration_minutes*60)<>0 THEN
    RAISE EXCEPTION 'Choose an available appointment time' USING ERRCODE='22023';
  END IF;
  start_at:=(_booking_date+_start_time) AT TIME ZONE avail.timezone;
  finish_at:=start_at+make_interval(mins=>product.duration_minutes);
  IF start_at<=now() OR start_at>now()+interval '365 days' THEN
    RAISE EXCEPTION 'Choose a future appointment within one year' USING ERRCODE='22023';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.bookings b JOIN public.creator_products cp ON cp.id=b.product_id
    CROSS JOIN LATERAL (SELECT COALESCE(b.starts_at,(b.booking_date+b.start_time) AT TIME ZONE
      CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=b.timezone) THEN b.timezone ELSE 'UTC' END) AS starts) times
    WHERE b.creator_id=product.creator_id
      AND (b.status='paid' OR (b.status='pending' AND COALESCE(b.reserved_until,b.created_at+interval '15 minutes')>now()))
      AND times.starts<finish_at
      AND COALESCE(b.ends_at,times.starts+make_interval(mins=>GREATEST(1,LEAST(COALESCE(b.duration_minutes,cp.duration_minutes,30),480))))>start_at
  ) THEN RAISE EXCEPTION 'That appointment was just reserved. Choose another time.' USING ERRCODE='23505'; END IF;
  expires_at:=now()+interval '35 minutes';
  INSERT INTO public.bookings(product_id,creator_id,buyer_email,booking_date,start_time,timezone,status,reservation_key,
    reserved_until,starts_at,ends_at,price_cents,duration_minutes,created_at,updated_at)
  VALUES(product.id,product.creator_id,lower(trim(_buyer_email)),_booking_date,_start_time,avail.timezone,'pending',_request_key,
    expires_at,start_at,finish_at,product.price_cents,product.duration_minutes,now(),now()) RETURNING id INTO booking_id;
  RETURN jsonb_build_object('bookingId',booking_id,'creatorId',product.creator_id,'expiresAt',expires_at,
    'priceCents',product.price_cents,'durationMinutes',product.duration_minutes,'stripeSessionId',NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_creator_booking(uuid,text,date,time,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_creator_booking(uuid,text,date,time,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_booking_slots(_product_id uuid,_from date,_to date)
RETURNS TABLE(booking_date date,start_time time,status text,created_at timestamptz,reserved_until timestamptz,starts_at timestamptz,ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT b.booking_date,b.start_time,b.status,b.created_at,COALESCE(b.reserved_until,b.created_at+interval '15 minutes'),times.starts,
   COALESCE(b.ends_at,times.starts+make_interval(mins=>GREATEST(1,LEAST(COALESCE(b.duration_minutes,cp.duration_minutes,30),480))))
 FROM public.creator_products requested JOIN public.bookings b ON b.creator_id=requested.creator_id
 JOIN public.creator_products cp ON cp.id=b.product_id
 CROSS JOIN LATERAL (SELECT COALESCE(b.starts_at,(b.booking_date+b.start_time) AT TIME ZONE
   CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=b.timezone) THEN b.timezone ELSE 'UTC' END) AS starts) times
 WHERE requested.id=_product_id AND requested.is_active IS TRUE AND public.creator_booking_is_public(requested.creator_id)
   AND _from IS NOT NULL AND _to IS NOT NULL AND _to>=_from AND _to-_from<=31
   AND b.booking_date BETWEEN _from-1 AND _to+1
   AND (b.status='paid' OR (b.status='pending' AND COALESCE(b.reserved_until,b.created_at+interval '15 minutes')>now()))
 ORDER BY times.starts;
$$;
REVOKE ALL ON FUNCTION public.get_public_booking_slots(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_slots(uuid,date,date) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fulfill_creator_booking(_booking_id uuid,_reservation_key uuid,_session_id text,_product_id uuid,_amount integer,_currency text,_buyer_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; creator uuid; conflict boolean;
BEGIN
  SELECT creator_id INTO creator FROM public.bookings WHERE id=_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('creator-booking:'||creator::text,0));
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
  IF _reservation_key IS NULL OR b.reservation_key IS DISTINCT FROM _reservation_key OR b.product_id IS DISTINCT FROM _product_id
      OR _session_id IS NULL OR _session_id !~ '^cs_[A-Za-z0-9_]+$' OR b.stripe_session_id IS DISTINCT FROM _session_id
      OR _amount IS DISTINCT FROM b.price_cents OR _currency IS DISTINCT FROM 'usd'
      OR lower(trim(_buyer_email)) IS DISTINCT FROM lower(trim(b.buyer_email)) THEN
    RAISE EXCEPTION 'Payment does not match its reservation' USING ERRCODE='22023';
  END IF;
  IF b.status='paid' THEN RETURN jsonb_build_object('confirmed',true,'reviewRequired',false,'alreadyConfirmed',true); END IF;
  IF b.status='payment_review' THEN RETURN jsonb_build_object('confirmed',false,'reviewRequired',true,'alreadyConfirmed',false); END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.bookings other JOIN public.creator_products cp ON cp.id=other.product_id
    CROSS JOIN LATERAL (SELECT COALESCE(other.starts_at,(other.booking_date+other.start_time) AT TIME ZONE
      CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=other.timezone) THEN other.timezone ELSE 'UTC' END) AS starts) times
    WHERE other.creator_id=b.creator_id AND other.id<>b.id
      AND (other.status='paid' OR (other.status='pending' AND COALESCE(other.reserved_until,other.created_at+interval '15 minutes')>now()))
      AND times.starts<b.ends_at
      AND COALESCE(other.ends_at,times.starts+make_interval(mins=>GREATEST(1,LEAST(COALESCE(other.duration_minutes,cp.duration_minutes,30),480))))>b.starts_at
  ) INTO conflict;
  IF b.status<>'pending' OR b.starts_at IS NULL OR b.starts_at<=now() OR conflict THEN
    UPDATE public.bookings SET status='payment_review',updated_at=now() WHERE id=b.id;
    RETURN jsonb_build_object('confirmed',false,'reviewRequired',true,'alreadyConfirmed',false);
  END IF;
  UPDATE public.bookings SET status='paid',updated_at=now() WHERE id=b.id;
  RETURN jsonb_build_object('confirmed',true,'reviewRequired',false,'alreadyConfirmed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_creator_booking(uuid,uuid,text,uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_creator_booking(uuid,uuid,text,uuid,integer,text,text) TO service_role;

-- Marketplace fulfillment owns payment proof and receipt delivery state.
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS buyer_email_started_at timestamptz;
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS buyer_email_sent_at timestamptz;
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS creator_email_started_at timestamptz;
ALTER TABLE public.creator_purchases ADD COLUMN IF NOT EXISTS creator_email_sent_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS creator_purchases_session_unique ON public.creator_purchases(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS creator_purchases_payment_intent_unique ON public.creator_purchases(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
REVOKE INSERT,UPDATE,DELETE ON public.creator_purchases FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.creator_purchases TO service_role;

-- Reps can edit contact details, but cannot reinstate access, exempt their
-- commissions from quality checks, or rewrite the accepted agreement.
CREATE OR REPLACE FUNCTION public.guard_sales_rep_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW)-'name'-'phone'-'payout_method'-'updated_at') IS DISTINCT FROM
     (to_jsonb(OLD)-'name'-'phone'-'payout_method'-'updated_at') THEN
    RAISE EXCEPTION 'Rep access and agreement fields are managed by TapAway' USING ERRCODE='42501';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_sales_rep_authority ON public.sales_reps;
CREATE TRIGGER guard_sales_rep_authority BEFORE UPDATE ON public.sales_reps FOR EACH ROW EXECUTE FUNCTION public.guard_sales_rep_authority();
DROP POLICY IF EXISTS "Reps can insert own demo request" ON public.rep_demo_requests;
CREATE POLICY "Reps can insert own demo request" ON public.rep_demo_requests FOR INSERT TO authenticated
  WITH CHECK(rep_user_id=auth.uid() AND public.is_sales_rep());
CREATE OR REPLACE FUNCTION public.guard_rep_demo_request()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.rep_user_id IS DISTINCT FROM auth.uid() OR NOT public.is_sales_rep()
      OR NEW.fulfilled IS DISTINCT FROM false OR NEW.tracking_number IS NOT NULL OR NEW.shipped_at IS NOT NULL THEN
    RAISE EXCEPTION 'Only active reps can request a pending demo kit' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('rep-demo:'||NEW.rep_user_id::text,0));
  IF EXISTS(SELECT 1 FROM public.rep_demo_requests WHERE rep_user_id=NEW.rep_user_id) THEN
    RAISE EXCEPTION 'A demo kit has already been requested' USING ERRCODE='23505';
  END IF;
  NEW.requested_at:=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_rep_demo_request ON public.rep_demo_requests;
CREATE TRIGGER guard_rep_demo_request BEFORE INSERT ON public.rep_demo_requests FOR EACH ROW EXECUTE FUNCTION public.guard_rep_demo_request();

-- A valid single-use free offer applies only to its owner's new onboarding.
-- It never converts a billed or specifically paused account into a gift.
CREATE OR REPLACE FUNCTION public.redeem_free_promo_token(p_token_id uuid,p_user_id uuid,p_restaurant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE restaurant public.restaurants%ROWTYPE; burned integer;
BEGIN
  IF p_token_id IS NULL OR p_user_id IS NULL OR p_restaurant_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO restaurant FROM public.restaurants WHERE id=p_restaurant_id FOR UPDATE;
  IF NOT FOUND OR restaurant.owner_id IS DISTINCT FROM p_user_id
      OR restaurant.stripe_subscription_id IS NOT NULL
      OR restaurant.subscription_status='active'
      OR COALESCE(restaurant.payment_state,'unknown_manual') NOT IN ('unknown_manual','pending') THEN
    RETURN false;
  END IF;
  UPDATE public.promo_tokens SET is_used=true,used_by_user_id=p_user_id,reserved_by=NULL,reserved_at=NULL
  WHERE id=p_token_id AND is_used=false AND expires_at>now() AND discount_type='free'
    AND (reserved_by IS NULL OR reserved_by=p_user_id OR reserved_at<now()-interval '60 minutes');
  GET DIAGNOSTICS burned=ROW_COUNT;
  IF burned<>1 THEN RETURN false; END IF;
  UPDATE public.restaurants SET subscription_status='active',payment_state='complimentary',
    onboarding_completed=true,onboarding_step=4 WHERE id=restaurant.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_free_promo_token(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_free_promo_token(uuid,uuid,uuid) TO service_role;

-- Public form delivery goes through the quota-protected submission endpoint.
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.lead_submissions;
REVOKE INSERT ON public.lead_submissions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.lead_submissions TO service_role;
DROP POLICY IF EXISTS "Public can view active lead forms" ON public.lead_forms;
CREATE POLICY "Public can view active lead forms" ON public.lead_forms FOR SELECT TO anon,authenticated
  USING(is_active IS TRUE AND public.personal_profile_is_active(profile_id));

-- Current analytics clients use the server collectors. Old raw tables remain
-- readable by their existing owners but cannot be backfilled by a browser.
DROP POLICY IF EXISTS "Anyone can insert valid personal analytics" ON public.personal_analytics;
DROP POLICY IF EXISTS "Anyone can insert valid analytics events" ON public.analytics_events;
REVOKE INSERT ON public.personal_analytics,public.analytics_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.personal_analytics,public.analytics_events TO service_role;

-- Preserve the existing public forms while preventing forged review/ownership
-- states and backdated submissions that bypass the intake velocity triggers.
CREATE OR REPLACE FUNCTION public.guard_public_intake_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  NEW.created_at:=now();
  IF TG_TABLE_NAME='support_requests' THEN
    NEW.user_id:=auth.uid(); NEW.status:='NEW'; NEW.updated_at:=now();
  ELSIF TG_TABLE_NAME='rep_applications' THEN
    NEW.status:='pending'; NEW.reviewed_at:=NULL; NEW.reviewed_by:=NULL;
  ELSIF TG_TABLE_NAME='personal_email_captures' THEN
    NEW.sms_opt_in_at:=CASE WHEN NEW.sms_opt_in IS TRUE THEN now() ELSE NULL END;
    NEW.sms_marketing_opt_in_at:=CASE WHEN NEW.sms_marketing_opt_in IS TRUE THEN now() ELSE NULL END;
    NEW.sms_transactional_opt_in_at:=CASE WHEN NEW.sms_transactional_opt_in IS TRUE THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_public_intake_authority ON public.support_requests;
CREATE TRIGGER guard_public_intake_authority BEFORE INSERT ON public.support_requests FOR EACH ROW EXECUTE FUNCTION public.guard_public_intake_authority();
DROP TRIGGER IF EXISTS guard_public_intake_authority ON public.rep_applications;
CREATE TRIGGER guard_public_intake_authority BEFORE INSERT ON public.rep_applications FOR EACH ROW EXECUTE FUNCTION public.guard_public_intake_authority();
DROP TRIGGER IF EXISTS guard_public_intake_authority ON public.personal_email_captures;
CREATE TRIGGER guard_public_intake_authority BEFORE INSERT ON public.personal_email_captures FOR EACH ROW EXECUTE FUNCTION public.guard_public_intake_authority();
DROP POLICY IF EXISTS "Anyone can submit email captures" ON public.personal_email_captures;
CREATE POLICY "Anyone can submit email captures" ON public.personal_email_captures FOR INSERT TO anon,authenticated
  WITH CHECK(public.personal_profile_is_active(profile_id));

CREATE OR REPLACE FUNCTION public.restaurant_is_active(_restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=_restaurant_id
   AND public.hub_access_allowed(r.subscription_status,r.is_approved,r.payment_state,r.trial_ends_at,r.created_at,r.stripe_subscription_id));
$$;
REVOKE ALL ON FUNCTION public.restaurant_is_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_is_active(uuid) TO anon,authenticated,service_role;

-- All current public forms now use the bounded public-intake endpoint. Contact
-- capture and its optional consent evidence commit in the same transaction.
REVOKE INSERT ON public.personal_email_captures,public.support_requests,public.rep_applications,public.sms_signup_submissions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.personal_email_captures,public.support_requests,public.rep_applications,public.sms_signup_submissions TO service_role;
CREATE OR REPLACE FUNCTION public.record_personal_capture(p_profile_id uuid,p_name text,p_email text,p_phone text,p_message text,
  p_marketing_consent boolean,p_transactional_consent boolean,p_marketing_text text,p_transactional_text text,p_user_agent text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE captured_id uuid; accepted_at timestamptz:=now(); email text:=nullif(lower(trim(p_email)),''); phone text:=nullif(trim(p_phone),'');
  marketing boolean:=COALESCE(p_marketing_consent,false); transactional boolean:=COALESCE(p_transactional_consent,false);
BEGIN
  IF NOT public.personal_profile_is_active(p_profile_id) THEN RAISE EXCEPTION 'This hub is unavailable' USING ERRCODE='22023'; END IF;
  IF (email IS NULL AND phone IS NULL) OR length(email)>254 OR (email IS NOT NULL AND email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')
    OR length(phone)>30 OR length(p_name)>120 OR length(p_message)>2000 OR length(p_user_agent)>500
    OR (marketing AND (phone IS NULL OR nullif(trim(p_marketing_text),'') IS NULL OR length(p_marketing_text)>2000))
    OR (transactional AND (phone IS NULL OR nullif(trim(p_transactional_text),'') IS NULL OR length(p_transactional_text)>2000)) THEN
    RAISE EXCEPTION 'Invalid contact details or consent' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.personal_email_captures(profile_id,name,email,phone,message,created_at,sms_opt_in,sms_opt_in_at,
    sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in,sms_transactional_opt_in_at)
  VALUES(p_profile_id,nullif(trim(p_name),''),email,phone,nullif(trim(p_message),''),accepted_at,marketing OR transactional,
    CASE WHEN marketing OR transactional THEN accepted_at END,marketing,CASE WHEN marketing THEN accepted_at END,transactional,CASE WHEN transactional THEN accepted_at END)
  RETURNING id INTO captured_id;
  IF marketing OR transactional THEN
    INSERT INTO public.sms_signup_submissions(name,phone,consent_text,consent_at,marketing_consent_text,marketing_consent_at,
      transactional_consent_text,transactional_consent_at,user_agent,source,created_at)
    VALUES(COALESCE(nullif(trim(p_name),''),'Website visitor'),phone,CASE WHEN marketing THEN p_marketing_text ELSE p_transactional_text END,accepted_at,
      CASE WHEN marketing THEN p_marketing_text END,CASE WHEN marketing THEN accepted_at END,
      CASE WHEN transactional THEN p_transactional_text END,CASE WHEN transactional THEN accepted_at END,p_user_agent,'personal-hub:'||p_profile_id::text,accepted_at);
  END IF;
  RETURN captured_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_personal_capture(uuid,text,text,text,text,boolean,boolean,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_personal_capture(uuid,text,text,text,text,boolean,boolean,text,text,text) TO service_role;

-- The older standalone add-on keeps its original three-card calendar-month
-- allowance. Server code verifies its current live Stripe invoice and charge;
-- this transaction serializes all pages using that same paid subscription.
ALTER TABLE public.personal_card_requests ADD COLUMN IF NOT EXISTS legacy_card_subscription_id text;
ALTER TABLE public.personal_card_requests ADD COLUMN IF NOT EXISTS legacy_card_invoice_id text;
ALTER TABLE public.personal_card_requests ADD COLUMN IF NOT EXISTS legacy_card_payment_intent_id text;
ALTER TABLE public.personal_card_requests ADD COLUMN IF NOT EXISTS request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS personal_card_requests_request_key_unique ON public.personal_card_requests(request_key) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS personal_card_requests_legacy_period ON public.personal_card_requests(legacy_card_subscription_id,created_at);
CREATE OR REPLACE FUNCTION public.reserve_legacy_card_addon(_profile_id uuid,_owner_id uuid,_stripe_customer_id text,_stripe_subscription_id text,
  _stripe_invoice_id text,_stripe_payment_intent_id text,_quantity integer,_shipping jsonb,_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE profile public.personal_profiles%ROWTYPE; previous public.personal_card_requests%ROWTYPE;
  used integer; request_id uuid; period_start timestamptz:=(date_trunc('month',now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC'; field text;
BEGIN
  IF _request_key IS NULL OR _quantity IS NULL OR _quantity NOT BETWEEN 1 AND 3 OR _shipping IS NULL OR jsonb_typeof(_shipping)<>'object'
    OR _stripe_customer_id IS NULL OR _stripe_customer_id !~ '^cus_[A-Za-z0-9]+$'
    OR _stripe_subscription_id IS NULL OR _stripe_subscription_id !~ '^sub_[A-Za-z0-9]+$'
    OR _stripe_invoice_id IS NULL OR _stripe_invoice_id !~ '^in_[A-Za-z0-9]+$'
    OR _stripe_payment_intent_id IS NULL OR _stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid card request' USING ERRCODE='22023';
  END IF;
  FOREACH field IN ARRAY ARRAY['name','line1','city','state','postal_code','country'] LOOP
    IF nullif(trim(_shipping->>field),'') IS NULL OR length(_shipping->>field)>200 THEN
      RAISE EXCEPTION 'Complete shipping address required' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF length(COALESCE(_shipping->>'line2',''))>200 OR _shipping->>'country' !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Invalid shipping address' USING ERRCODE='22023'; END IF;
  -- Same lock order as the durable refund guards introduced in the following
  -- migration: no reversal can commit between proof binding and reservation.
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-reversal:sub:'||_stripe_subscription_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-reversal:pi:'||_stripe_payment_intent_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('legacy-card-addon:'||_stripe_subscription_id,0));
  SELECT * INTO profile FROM public.personal_profiles WHERE id=_profile_id FOR SHARE;
  IF NOT FOUND OR profile.user_id IS DISTINCT FROM _owner_id OR profile.stripe_customer_id IS DISTINCT FROM _stripe_customer_id
    OR profile.plan_type='personal_hosted' OR COALESCE(profile.onboarding_source,'') LIKE 'payment_first%'
    OR NOT public.personal_profile_is_active(profile.id) THEN
    RAISE EXCEPTION 'This account is not eligible for this card allowance' USING ERRCODE='22023';
  END IF;
  SELECT * INTO previous FROM public.personal_card_requests WHERE request_key=_request_key;
  IF FOUND THEN
    IF previous.profile_id IS DISTINCT FROM _profile_id OR previous.user_id IS DISTINCT FROM _owner_id
      OR previous.legacy_card_subscription_id IS DISTINCT FROM _stripe_subscription_id OR previous.quantity IS DISTINCT FROM _quantity
      OR previous.shipping_name IS DISTINCT FROM _shipping->>'name' OR previous.shipping_address_line1 IS DISTINCT FROM _shipping->>'line1'
      OR COALESCE(previous.shipping_address_line2,'') IS DISTINCT FROM COALESCE(_shipping->>'line2','')
      OR previous.shipping_city IS DISTINCT FROM _shipping->>'city' OR previous.shipping_state IS DISTINCT FROM _shipping->>'state'
      OR previous.shipping_postal_code IS DISTINCT FROM _shipping->>'postal_code' OR previous.shipping_country IS DISTINCT FROM _shipping->>'country' THEN
      RAISE EXCEPTION 'This request key belongs to different card details' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('success',true,'requestId',previous.id,'duplicate',true);
  END IF;
  SELECT COALESCE(sum(r.quantity),0) INTO used FROM public.personal_card_requests r
    WHERE r.created_at>=period_start AND r.status NOT IN ('canceled','cancelled','rejected')
    AND (r.legacy_card_subscription_id=_stripe_subscription_id OR (r.legacy_card_subscription_id IS NULL
      AND r.profile_id IN(SELECT p.id FROM public.personal_profiles p WHERE p.stripe_customer_id=_stripe_customer_id)));
  IF used+_quantity>3 THEN RETURN jsonb_build_object('success',false,'reason','allowance_exhausted','remaining',GREATEST(0,3-used)); END IF;
  INSERT INTO public.personal_card_requests(profile_id,user_id,quantity,is_addon,status,shipping_name,shipping_address_line1,shipping_address_line2,
    shipping_city,shipping_state,shipping_postal_code,shipping_country,legacy_card_subscription_id,legacy_card_invoice_id,legacy_card_payment_intent_id,request_key)
  VALUES(profile.id,profile.user_id,_quantity,true,'pending',_shipping->>'name',_shipping->>'line1',nullif(_shipping->>'line2',''),
    _shipping->>'city',_shipping->>'state',_shipping->>'postal_code',_shipping->>'country',_stripe_subscription_id,_stripe_invoice_id,_stripe_payment_intent_id,_request_key)
  RETURNING id INTO request_id;
  RETURN jsonb_build_object('success',true,'requestId',request_id,'duplicate',false,'remaining',3-used-_quantity);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_legacy_card_addon(uuid,uuid,text,text,text,text,integer,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_legacy_card_addon(uuid,uuid,text,text,text,text,integer,jsonb,uuid) TO service_role;

-- Browser referral capture can record the signed-in customer's own attribution,
-- never self-referrals, another customer's profile, or fabricated timestamps.
-- Validators can see the minimal relationship despite normal affiliate privacy.
CREATE OR REPLACE FUNCTION public.affiliate_referral_is_valid(_affiliate_id uuid,_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.affiliates a
   WHERE a.id=_affiliate_id AND a.is_active IS TRUE AND a.user_id<>auth.uid())
   AND (_profile_id IS NULL OR EXISTS(SELECT 1 FROM public.personal_profiles p WHERE p.id=_profile_id AND p.user_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.affiliate_referral_is_valid(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.affiliate_referral_is_valid(uuid,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_affiliate_referral_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP<>'INSERT' OR NEW.referred_user_id IS DISTINCT FROM auth.uid()
    OR NOT public.affiliate_referral_is_valid(NEW.affiliate_id,NEW.referred_profile_id) THEN
    RAISE EXCEPTION 'Referral attribution must belong to this account' USING ERRCODE='42501';
  END IF;
  NEW.created_at:=now(); NEW.ip_address:=NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_affiliate_referral_authority ON public.affiliate_referrals;
CREATE TRIGGER guard_affiliate_referral_authority BEFORE INSERT OR UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.guard_affiliate_referral_authority();
CREATE OR REPLACE FUNCTION public.affiliate_profile_attribution_is_valid(_profile_id uuid,_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.affiliate_referrals r JOIN public.affiliates a ON a.id=r.affiliate_id
   WHERE r.referred_user_id=auth.uid() AND (r.referred_profile_id IS NULL OR r.referred_profile_id=_profile_id)
     AND a.referral_code=lower(trim(_code)) AND a.is_active IS TRUE AND a.user_id<>auth.uid());
$$;
REVOKE ALL ON FUNCTION public.affiliate_profile_attribution_is_valid(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.affiliate_profile_attribution_is_valid(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_profile_referral_attribution()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR auth.role()='service_role' OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.referred_by IS NOT DISTINCT FROM OLD.referred_by THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.referred_by IS NOT NULL THEN
    RAISE EXCEPTION 'An existing referral is managed by TapAway' USING ERRCODE='42501';
  END IF;
  IF NEW.referred_by IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() OR NOT public.affiliate_profile_attribution_is_valid(NEW.id,NEW.referred_by) THEN
      RAISE EXCEPTION 'A matching referral is required' USING ERRCODE='42501';
    END IF;
    NEW.referred_by:=lower(trim(NEW.referred_by));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_referral_attribution ON public.personal_profiles;
CREATE TRIGGER guard_profile_referral_attribution BEFORE INSERT OR UPDATE ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_referral_attribution();
