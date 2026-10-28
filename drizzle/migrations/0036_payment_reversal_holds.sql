-- Signed refund/dispute events leave a durable, monotonic hold even when
-- checkout fulfillment has not created its local rows yet. No historic account
-- is changed by this migration. All writes remain behind service-role handlers.
CREATE TABLE IF NOT EXISTS public.payment_reversal_holds (
  mode text NOT NULL CHECK (mode IN ('live','test')),
  stripe_payment_intent_id text NOT NULL CHECK (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  stripe_subscription_id text,
  reason text NOT NULL CHECK (reason IN ('partial_refund','refunded','disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mode,stripe_payment_intent_id)
);
CREATE INDEX IF NOT EXISTS payment_reversal_subscription_idx ON public.payment_reversal_holds(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
ALTER TABLE public.payment_reversal_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_reversal_holds FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.payment_reversal_holds TO service_role;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS payment_hold_at timestamptz;
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS payment_hold_reason text;

-- Locks intentionally omit mode: Stripe object ids are globally unique and
-- profiles have no mode column. Every guard takes the subscription lock first.
CREATE OR REPLACE FUNCTION public.lock_payment_reversal_binding(_payment_intent_id text,_subscription_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _subscription_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('payment-reversal:sub:'||_subscription_id,0));
  END IF;
  IF _payment_intent_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('payment-reversal:pi:'||_payment_intent_id,0));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_payment_reversal_binding(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lock_payment_reversal_binding(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.payment_reversal_reason(_mode text,_payment_intent_id text,_subscription_id text)
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public AS $$
  SELECT reason FROM public.payment_reversal_holds
  WHERE (_mode IS NULL OR mode=_mode)
    AND ((_payment_intent_id IS NOT NULL AND stripe_payment_intent_id=_payment_intent_id)
      OR (_subscription_id IS NOT NULL AND stripe_subscription_id=_subscription_id))
  ORDER BY CASE reason WHEN 'disputed' THEN 3 WHEN 'refunded' THEN 2 ELSE 1 END DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.payment_reversal_reason(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_reversal_reason(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_order_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text; mode_name text;
BEGIN
  mode_name:=CASE WHEN NEW.stripe_livemode THEN 'live' ELSE 'test' END;
  PERFORM public.lock_payment_reversal_binding(NEW.stripe_payment_intent_id,NEW.stripe_subscription_id);
  -- A later subscription invoice does not retrospectively refund printed cards.
  reason:=public.payment_reversal_reason(mode_name,NEW.stripe_payment_intent_id,NULL);
  IF TG_OP='UPDATE' AND reason IS NULL AND OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id THEN
    PERFORM public.lock_payment_reversal_binding(OLD.stripe_payment_intent_id,NULL);
    reason:=public.payment_reversal_reason(CASE WHEN OLD.stripe_livemode THEN 'live' ELSE 'test' END,OLD.stripe_payment_intent_id,NULL);
  END IF;
  IF reason IS NOT NULL THEN
    IF reason IN ('refunded','disputed') THEN NEW.status:=reason; END IF;
    NEW.production_status:='on_hold'; NEW.activation_started_at:=NULL;
    IF TG_OP='UPDATE' THEN NEW.activated_at:=OLD.activated_at; ELSE NEW.activated_at:=NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_order_payment_reversal ON public.personal_card_orders;
CREATE TRIGGER zz_guard_order_payment_reversal BEFORE INSERT OR UPDATE ON public.personal_card_orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_payment_reversal();

CREATE OR REPLACE FUNCTION public.guard_creator_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
  PERFORM public.lock_payment_reversal_binding(NEW.stripe_payment_intent_id,NULL);
  reason:=public.payment_reversal_reason(CASE WHEN NEW.stripe_session_id LIKE 'cs_test_%' THEN 'test' ELSE 'live' END,NEW.stripe_payment_intent_id,NULL);
  IF TG_OP='UPDATE' AND reason IS NULL AND OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id THEN
    PERFORM public.lock_payment_reversal_binding(OLD.stripe_payment_intent_id,NULL);
    reason:=public.payment_reversal_reason(CASE WHEN OLD.stripe_session_id LIKE 'cs_test_%' THEN 'test' ELSE 'live' END,OLD.stripe_payment_intent_id,NULL);
  END IF;
  IF reason IS NOT NULL THEN
    NEW.payment_status:=CASE WHEN reason='partial_refund' THEN 'payment_review' ELSE reason END;
    NEW.access_expires_at:=LEAST(NEW.access_expires_at,now());
    NEW.buyer_email_started_at:=NULL; NEW.creator_email_started_at:=NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_creator_payment_reversal ON public.creator_purchases;
CREATE TRIGGER zz_guard_creator_payment_reversal BEFORE INSERT OR UPDATE ON public.creator_purchases FOR EACH ROW EXECUTE FUNCTION public.guard_creator_payment_reversal();

-- Free monthly cards bind the same verified invoice payment as the server
-- allowance request. A refund that races the proof lookup cannot create a
-- printable request, and already shipped cards retain their truthful status.
CREATE OR REPLACE FUNCTION public.guard_legacy_card_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
  IF NEW.legacy_card_payment_intent_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.lock_payment_reversal_binding(NEW.legacy_card_payment_intent_id,NEW.legacy_card_subscription_id);
  reason:=public.payment_reversal_reason('live',NEW.legacy_card_payment_intent_id,NEW.legacy_card_subscription_id);
  IF reason IS NOT NULL THEN
    IF TG_OP='INSERT' THEN RAISE EXCEPTION 'This payment requires review before requesting cards' USING ERRCODE='22023'; END IF;
    NEW.status:=CASE WHEN OLD.status IN ('shipped','canceled','cancelled','rejected') THEN OLD.status ELSE 'on_hold' END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_legacy_card_payment_reversal ON public.personal_card_requests;
CREATE TRIGGER zz_guard_legacy_card_payment_reversal BEFORE INSERT OR UPDATE ON public.personal_card_requests FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_card_payment_reversal();

CREATE OR REPLACE FUNCTION public.guard_profile_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text; order_row record;
BEGIN
  PERFORM public.lock_payment_reversal_binding(NULL,NEW.stripe_subscription_id);
  reason:=public.payment_reversal_reason(NULL,NULL,NEW.stripe_subscription_id);
  IF reason IS NULL AND TG_TABLE_NAME='personal_profiles' THEN
    -- Also covers a refund received before the original order had its PI bound,
    -- including an initial one-time checkout with no subscription metadata.
    FOR order_row IN SELECT stripe_payment_intent_id,stripe_livemode FROM public.personal_card_orders WHERE personal_profile_id=NEW.id LOOP
      PERFORM public.lock_payment_reversal_binding(order_row.stripe_payment_intent_id,NULL);
      reason:=public.payment_reversal_reason(CASE WHEN order_row.stripe_livemode THEN 'live' ELSE 'test' END,order_row.stripe_payment_intent_id,NULL);
      EXIT WHEN reason IS NOT NULL;
    END LOOP;
  END IF;
  IF reason IS NOT NULL THEN
    NEW.subscription_status:='past_due'; NEW.payment_state:='past_due'; NEW.is_approved:=false; NEW.trial_ends_at:=NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_profile_payment_reversal ON public.personal_profiles;
CREATE TRIGGER zz_guard_profile_payment_reversal BEFORE INSERT OR UPDATE ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_payment_reversal();
DROP TRIGGER IF EXISTS zz_guard_profile_payment_reversal ON public.restaurants;
CREATE TRIGGER zz_guard_profile_payment_reversal BEFORE INSERT OR UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.guard_profile_payment_reversal();

CREATE OR REPLACE FUNCTION public.guard_business_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text; subscription_id text;
BEGIN
  IF TG_TABLE_NAME='checkout_intents' THEN subscription_id:=NEW.stripe_subscription_id;
  ELSE subscription_id:=NEW.main_stripe_subscription_id; END IF;
  PERFORM public.lock_payment_reversal_binding(NULL,subscription_id);
  reason:=public.payment_reversal_reason(NULL,NULL,subscription_id);
  IF reason IS NOT NULL THEN
    IF TG_TABLE_NAME='checkout_intents' THEN
      NEW.status:='needs_review'; NEW.payment_hold_at:=COALESCE(NEW.payment_hold_at,now()); NEW.payment_hold_reason:=reason;
      NEW.review_reason:='Payment reversal requires review';
    ELSE NEW.status:='past_due'; NEW.review_reason:='Payment reversal requires review'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_business_payment_reversal ON public.checkout_intents;
CREATE TRIGGER zz_guard_business_payment_reversal BEFORE INSERT OR UPDATE ON public.checkout_intents FOR EACH ROW EXECUTE FUNCTION public.guard_business_payment_reversal();
DROP TRIGGER IF EXISTS zz_guard_business_payment_reversal ON public.card_club_memberships;
CREATE TRIGGER zz_guard_business_payment_reversal BEFORE INSERT OR UPDATE ON public.card_club_memberships FOR EACH ROW EXECUTE FUNCTION public.guard_business_payment_reversal();

ALTER TABLE public.hub_payment_requests DROP CONSTRAINT IF EXISTS hub_payment_requests_payment_hold_reason_check;
ALTER TABLE public.hub_payment_requests ADD CONSTRAINT hub_payment_requests_payment_hold_reason_check
  CHECK(payment_hold_reason IN ('partial_refund','refunded','disputed'));
CREATE OR REPLACE FUNCTION public.guard_hub_request_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
  PERFORM public.lock_payment_reversal_binding(NULL,NEW.stripe_subscription_id);
  reason:=public.payment_reversal_reason('live',NULL,NEW.stripe_subscription_id);
  IF reason IS NOT NULL THEN
    NEW.payment_hold_at:=COALESCE(NEW.payment_hold_at,now()); NEW.payment_hold_reason:=reason;
    NEW.welcome_email_started_at:=NULL;
    IF TG_OP='UPDATE' THEN NEW.fulfilled_at:=OLD.fulfilled_at; ELSE NEW.fulfilled_at:=NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_hub_request_payment_reversal ON public.hub_payment_requests;
CREATE TRIGGER zz_guard_hub_request_payment_reversal BEFORE INSERT OR UPDATE ON public.hub_payment_requests FOR EACH ROW EXECUTE FUNCTION public.guard_hub_request_payment_reversal();

CREATE OR REPLACE FUNCTION public.guard_booking_payment_reversal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE purchase public.creator_purchases%ROWTYPE;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  SELECT * INTO purchase FROM public.creator_purchases WHERE stripe_session_id=NEW.stripe_session_id;
  IF NOT FOUND OR purchase.product_id IS DISTINCT FROM NEW.product_id
      OR lower(trim(purchase.buyer_email)) IS DISTINCT FROM lower(trim(NEW.buyer_email))
      OR purchase.stripe_payment_intent_id IS NULL THEN
    -- Historical paid reservations remain readable; only new confirmations need
    -- the server-created proof row. This does not change existing bookings.
    IF TG_OP='UPDATE' AND OLD.status='paid' AND NEW.stripe_session_id IS NOT DISTINCT FROM OLD.stripe_session_id THEN RETURN NEW; END IF;
    NEW.status:='payment_review'; RETURN NEW;
  END IF;
  PERFORM public.lock_payment_reversal_binding(purchase.stripe_payment_intent_id,NULL);
  -- Re-read after lock acquisition so a refund that committed while waiting wins.
  SELECT * INTO purchase FROM public.creator_purchases WHERE id=purchase.id;
  IF purchase.payment_status NOT IN ('pending','paid') OR public.payment_reversal_reason(
      CASE WHEN purchase.stripe_session_id LIKE 'cs_test_%' THEN 'test' ELSE 'live' END,purchase.stripe_payment_intent_id,NULL) IS NOT NULL THEN
    NEW.status:='payment_review';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_guard_booking_payment_reversal ON public.bookings;
CREATE TRIGGER zz_guard_booking_payment_reversal BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_booking_payment_reversal();

CREATE OR REPLACE FUNCTION public.record_payment_reversal(_mode text,_payment_intent_id text,_subscription_id text DEFAULT NULL,_reason text DEFAULT 'refunded')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.payment_reversal_holds%ROWTYPE;
BEGIN
  IF _mode IS NULL OR _mode NOT IN ('live','test') OR _payment_intent_id IS NULL OR _payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
      OR (_subscription_id IS NOT NULL AND _subscription_id !~ '^sub_[A-Za-z0-9]+$')
      OR _reason IS NULL OR _reason NOT IN ('partial_refund','refunded','disputed') THEN
    RAISE EXCEPTION 'Invalid payment reversal' USING ERRCODE='22023';
  END IF;
  PERFORM public.lock_payment_reversal_binding(_payment_intent_id,_subscription_id);
  SELECT * INTO existing FROM public.payment_reversal_holds WHERE mode=_mode AND stripe_payment_intent_id=_payment_intent_id FOR UPDATE;
  IF FOUND AND existing.stripe_subscription_id IS NOT NULL AND _subscription_id IS NOT NULL AND existing.stripe_subscription_id<>_subscription_id THEN
    RAISE EXCEPTION 'Payment reversal subscription mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.payment_reversal_holds(mode,stripe_payment_intent_id,stripe_subscription_id,reason)
    VALUES(_mode,_payment_intent_id,_subscription_id,_reason)
  ON CONFLICT (mode,stripe_payment_intent_id) DO UPDATE SET
    stripe_subscription_id=COALESCE(payment_reversal_holds.stripe_subscription_id,EXCLUDED.stripe_subscription_id),
    reason=CASE WHEN payment_reversal_holds.reason='disputed' OR EXCLUDED.reason='disputed' THEN 'disputed'
      WHEN payment_reversal_holds.reason='refunded' OR EXCLUDED.reason='refunded' THEN 'refunded' ELSE 'partial_refund' END,
    updated_at=now();
  -- Guards apply the durable reason; no stale activation can overwrite it.
  UPDATE public.creator_purchases SET access_expires_at=LEAST(access_expires_at,now())
    WHERE stripe_payment_intent_id=_payment_intent_id
      AND (CASE WHEN stripe_session_id LIKE 'cs_test_%' THEN 'test' ELSE 'live' END)=_mode;
  UPDATE public.bookings SET status='payment_review',updated_at=now()
    WHERE stripe_session_id IN (SELECT stripe_session_id FROM public.creator_purchases WHERE stripe_payment_intent_id=_payment_intent_id
      AND (CASE WHEN stripe_session_id LIKE 'cs_test_%' THEN 'test' ELSE 'live' END)=_mode);
  IF _mode='live' THEN
    UPDATE public.personal_card_requests SET status='on_hold'
      WHERE (legacy_card_payment_intent_id=_payment_intent_id OR (_subscription_id IS NOT NULL AND legacy_card_subscription_id=_subscription_id))
        AND status NOT IN ('shipped','canceled','cancelled','rejected');
  END IF;
  UPDATE public.personal_card_orders SET production_status='on_hold',updated_at=now()
    WHERE stripe_payment_intent_id=_payment_intent_id AND stripe_livemode=(_mode='live');
  UPDATE public.personal_profiles SET subscription_status='past_due',payment_state='past_due',is_approved=false,updated_at=now()
    WHERE (_subscription_id IS NOT NULL AND stripe_subscription_id=_subscription_id)
      OR id IN (SELECT personal_profile_id FROM public.personal_card_orders WHERE stripe_payment_intent_id=_payment_intent_id AND stripe_livemode=(_mode='live'));
  IF _subscription_id IS NOT NULL THEN
    IF _mode='live' THEN
      UPDATE public.hub_payment_requests SET payment_hold_at=COALESCE(payment_hold_at,now()) WHERE stripe_subscription_id=_subscription_id;
    END IF;
    UPDATE public.restaurants SET subscription_status='past_due',payment_state='past_due',is_approved=false,updated_at=now()
      WHERE stripe_subscription_id=_subscription_id;
    UPDATE public.checkout_intents SET status='needs_review',updated_at=now() WHERE stripe_subscription_id=_subscription_id AND stripe_livemode=(_mode='live');
    UPDATE public.card_club_memberships SET status='past_due',updated_at=now() WHERE main_stripe_subscription_id=_subscription_id;
  END IF;
  RETURN jsonb_build_object('held',true,'reason',public.payment_reversal_reason(_mode,_payment_intent_id,NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.record_payment_reversal(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_reversal(text,text,text,text) TO service_role;

-- Return the actual guarded state, including a reversal that raced fulfillment.
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
  IF b.status='paid' THEN
    UPDATE public.bookings SET status='paid' WHERE id=b.id RETURNING status INTO b.status;
    RETURN jsonb_build_object('confirmed',b.status='paid','reviewRequired',b.status<>'paid','alreadyConfirmed',b.status='paid');
  END IF;
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
  UPDATE public.bookings SET status='paid',updated_at=now() WHERE id=b.id RETURNING status INTO b.status;
  RETURN jsonb_build_object('confirmed',b.status='paid','reviewRequired',b.status<>'paid','alreadyConfirmed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_creator_booking(uuid,uuid,text,uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_creator_booking(uuid,uuid,text,uuid,integer,text,text) TO service_role;

-- A late refund cannot report an already-held hub as activated. Both paths
-- take the shared subscription lock before profile/request row locks.
CREATE OR REPLACE FUNCTION public.fulfill_hub_payment(_profile_id uuid,_request_version uuid,_session_id text,_subscription_id text,_customer_id text,_billing_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.personal_profiles%ROWTYPE; r public.hub_payment_requests%ROWTYPE; reason text;
BEGIN
  IF _session_id IS NULL OR _session_id !~ '^cs_[A-Za-z0-9_]+$' OR _subscription_id IS NULL OR _subscription_id !~ '^sub_[A-Za-z0-9]+$'
      OR _customer_id IS NULL OR _customer_id !~ '^cus_[A-Za-z0-9]+$'
      OR _billing_email IS NULL OR length(_billing_email)>320 OR _billing_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid verified payment details' USING ERRCODE='22023';
  END IF;
  PERFORM public.lock_payment_reversal_binding(NULL,_subscription_id);
  SELECT * INTO p FROM public.personal_profiles WHERE id=_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hub not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO r FROM public.hub_payment_requests WHERE profile_id=_profile_id FOR UPDATE;
  IF NOT FOUND OR r.request_version IS DISTINCT FROM _request_version
      OR r.stripe_checkout_session_id IS DISTINCT FROM _session_id THEN
    RAISE EXCEPTION 'Payment request does not match this checkout' USING ERRCODE='22023';
  END IF;
  reason:=public.payment_reversal_reason('live',NULL,_subscription_id);
  IF r.payment_hold_at IS NOT NULL OR reason IS NOT NULL THEN
    IF reason IS NOT NULL THEN
      UPDATE public.hub_payment_requests SET stripe_subscription_id=_subscription_id,payment_hold_at=COALESCE(payment_hold_at,now()),payment_hold_reason=reason
        WHERE profile_id=_profile_id AND request_version=_request_version;
    END IF;
    RETURN jsonb_build_object('activated',false,'held',true,'reviewRequired',true);
  END IF;
  IF r.fulfilled_at IS NOT NULL THEN
    IF r.stripe_subscription_id IS DISTINCT FROM _subscription_id OR p.stripe_subscription_id IS DISTINCT FROM _subscription_id THEN
      RAISE EXCEPTION 'Payment request was fulfilled by another subscription' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('activated',p.subscription_status='active' AND p.payment_state='paying' AND p.is_approved IS TRUE,'alreadyFulfilled',true);
  END IF;
  IF p.payment_state IS DISTINCT FROM 'payment_required' OR p.is_approved IS DISTINCT FROM true
      OR (p.stripe_subscription_id IS NOT NULL AND p.stripe_subscription_id<>_subscription_id) THEN
    RAISE EXCEPTION 'This hub requires an admin review before activation' USING ERRCODE='22023';
  END IF;
  UPDATE public.personal_profiles SET payment_state='paying',subscription_status='active',
    stripe_subscription_id=_subscription_id,stripe_customer_id=_customer_id,
    stripe_billing_email=lower(trim(_billing_email)),trial_ends_at=NULL,updated_at=now()
    WHERE id=_profile_id RETURNING * INTO p;
  UPDATE public.hub_payment_requests SET fulfilled_at=now(),stripe_subscription_id=_subscription_id
    WHERE profile_id=_profile_id AND request_version=_request_version RETURNING * INTO r;
  RETURN jsonb_build_object('activated',r.payment_hold_at IS NULL AND p.subscription_status='active' AND p.payment_state='paying' AND p.is_approved IS TRUE,'alreadyFulfilled',false,'held',r.payment_hold_at IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_hub_payment(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_hub_payment(uuid,uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.hold_hub_payment_by_subscription(_subscription_id text,_reason text,_event_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE profile uuid; p public.personal_profiles%ROWTYPE; r public.hub_payment_requests%ROWTYPE;
BEGIN
  IF _reason NOT IN ('refunded','disputed') OR _reason IS NULL OR _event_id IS NULL OR _event_id !~ '^evt_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid verified payment hold' USING ERRCODE='22023';
  END IF;
  PERFORM public.lock_payment_reversal_binding(NULL,_subscription_id);
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
