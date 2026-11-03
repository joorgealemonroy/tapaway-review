CREATE TABLE public.subscription_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hub_kind text NOT NULL CHECK(hub_kind IN ('personal','restaurant')), hub_id uuid NOT NULL,
 intended_email text NOT NULL, bound_owner_id uuid, owner_placeholder boolean NOT NULL DEFAULT false, created_by uuid NOT NULL, token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 attempt_id uuid, attempt_started_at timestamptz, checkout_lock_id uuid, checkout_lock_at timestamptz, selection jsonb, stripe_checkout_session_id text UNIQUE,
 stripe_subscription_id text UNIQUE, stripe_customer_id text, stripe_payment_intent_id text,
 stripe_livemode boolean NOT NULL, paid_at timestamptz, access_user_id uuid, associated_at timestamptz,
 welcome_email_started_at timestamptz, welcome_email_sent_at timestamptz, access_token_hash text,
 access_expires_at timestamptz, access_consumed_at timestamptz, access_auth_hash text,
 shipping_address jsonb, payment_hold_at timestamptz, access_delivery_token text
);
GRANT SELECT ON public.subscription_invitations TO authenticated;
GRANT ALL ON public.subscription_invitations TO service_role;
ALTER TABLE public.subscription_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read optional invitations" ON public.subscription_invitations FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX subscription_invitations_hub_idx ON public.subscription_invitations(hub_kind,hub_id);
CREATE UNIQUE INDEX subscription_invitations_one_open_hub ON public.subscription_invitations(hub_kind,hub_id) WHERE revoked_at IS NULL;
ALTER TABLE public.card_club_memberships ADD COLUMN subscription_invitation_id uuid UNIQUE REFERENCES public.subscription_invitations(id);
ALTER TABLE public.personal_card_requests ADD COLUMN subscription_invitation_id uuid UNIQUE REFERENCES public.subscription_invitations(id);
ALTER TABLE public.fulfillment_orders ADD COLUMN subscription_invitation_id uuid UNIQUE REFERENCES public.subscription_invitations(id);

CREATE FUNCTION public.fulfill_subscription_invitation(_id uuid,_session text,_subscription text,_customer text,_payment text,_paid_at timestamptz,_shipping jsonb,_club_item text,_club_price text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.subscription_invitations%ROWTYPE; p jsonb; v_owner uuid; v_qty int; v_plan text;
BEGIN
 SELECT * INTO i FROM public.subscription_invitations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR i.revoked_at IS NOT NULL OR i.stripe_checkout_session_id IS DISTINCT FROM _session OR i.payment_hold_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation payment binding mismatch'; END IF;
 IF i.paid_at IS NOT NULL THEN
  IF i.stripe_subscription_id IS DISTINCT FROM _subscription THEN RAISE EXCEPTION 'Subscription mismatch'; END IF;
  RETURN jsonb_build_object('paid',true,'already',true);
 END IF;
 IF _subscription !~ '^sub_[A-Za-z0-9]+$' OR _customer !~ '^cus_[A-Za-z0-9]+$' OR _payment !~ '^pi_[A-Za-z0-9]+$' OR _paid_at IS NULL OR i.selection IS NULL THEN RAISE EXCEPTION 'Invalid verified payment'; END IF;
 IF EXISTS(SELECT 1 FROM public.payment_reversal_holds WHERE mode=CASE WHEN i.stripe_livemode THEN 'live' ELSE 'test' END AND (stripe_payment_intent_id=_payment OR stripe_subscription_id=_subscription)) THEN RAISE EXCEPTION 'Payment requires review'; END IF;
 IF i.hub_kind='personal' THEN SELECT to_jsonb(x) INTO p FROM public.personal_profiles x WHERE id=i.hub_id FOR UPDATE;
 ELSE SELECT to_jsonb(x) INTO p FROM public.restaurants x WHERE id=i.hub_id FOR UPDATE; END IF;
 v_owner := NULLIF(p->>CASE WHEN i.hub_kind='personal' THEN 'user_id' ELSE 'owner_id' END,'')::uuid;
 IF p IS NULL OR (p->>'is_approved')::boolean IS DISTINCT FROM true OR NULLIF(p->>'stripe_subscription_id','') IS NOT NULL OR v_owner IS DISTINCT FROM i.bound_owner_id OR COALESCE(p->>'subscription_status','') NOT IN ('active','trialing') OR COALESCE(p->>'payment_state','none') NOT IN ('unknown_manual','complimentary','none','trialing') THEN RAISE EXCEPTION 'Hub changed; admin review required'; END IF;
 v_qty := CASE WHEN i.selection->>'plan'='venue' THEN 15 ELSE 4 END;
 v_plan := (i.selection->>'plan') || CASE WHEN i.selection->>'interval'='year' THEN '_yearly' ELSE '' END;
 PERFORM set_config('tapaway.optional_subscription',i.id::text,true);
 IF i.hub_kind='personal' THEN
  UPDATE public.personal_profiles SET stripe_subscription_id=_subscription,stripe_customer_id=_customer,subscription_status='active',payment_state='paying',plan_type=v_plan,trial_ends_at=NULL WHERE id=i.hub_id;
 ELSE
  UPDATE public.restaurants SET stripe_subscription_id=_subscription,stripe_customer_id=_customer,subscription_status='active',payment_state='paying',plan_type=CASE WHEN v_plan='solo' THEN 'solo_pro' ELSE v_plan END,trial_ends_at=NULL,onboarding_completed=true WHERE id=i.hub_id;
 END IF;
 UPDATE public.subscription_invitations SET stripe_subscription_id=_subscription,stripe_customer_id=_customer,stripe_payment_intent_id=_payment,paid_at=_paid_at,shipping_address=_shipping WHERE id=i.id;
 IF (i.selection->>'cardClub')::boolean THEN
  IF _club_item IS NULL OR _club_price IS NULL THEN RAISE EXCEPTION 'Missing paid Card Club item'; END IF;
  INSERT INTO public.card_club_memberships(subscription_invitation_id,user_id,stripe_customer_id,main_stripe_subscription_id,card_club_stripe_subscription_id,card_club_stripe_subscription_item_id,stripe_price_id,status,plan,enrollment_date,card_club_paid_at,stripe_livemode)
  VALUES(i.id,v_owner,_customer,_subscription,_subscription,_club_item,_club_price,'active',i.selection->>'plan',_paid_at,_paid_at,i.stripe_livemode);
 END IF;
 RETURN jsonb_build_object('paid',true,'already',false);
END $$;
REVOKE ALL ON FUNCTION public.fulfill_subscription_invitation(uuid,text,text,text,text,timestamptz,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_subscription_invitation(uuid,text,text,text,text,timestamptz,jsonb,text,text) TO service_role;

CREATE FUNCTION public.associate_subscription_invitation(_id uuid,_user uuid,_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.subscription_invitations%ROWTYPE; p jsonb; v_owner uuid; v_qty int;
BEGIN
 SELECT * INTO i FROM public.subscription_invitations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR i.paid_at IS NULL OR i.payment_hold_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.intended_email IS DISTINCT FROM lower(_email) THEN RAISE EXCEPTION 'Verified access mismatch'; END IF;
 IF i.associated_at IS NOT NULL THEN
  IF i.access_user_id IS DISTINCT FROM _user THEN RAISE EXCEPTION 'Owner mismatch'; END IF;
  RETURN jsonb_build_object('associated',true);
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user::text,0));
 IF i.hub_kind='personal' THEN SELECT to_jsonb(x) INTO p FROM public.personal_profiles x WHERE id=i.hub_id FOR UPDATE;
 ELSE SELECT to_jsonb(x) INTO p FROM public.restaurants x WHERE id=i.hub_id FOR UPDATE; END IF;
 v_owner:=NULLIF(p->>CASE WHEN i.hub_kind='personal' THEN 'user_id' ELSE 'owner_id' END,'')::uuid;
 IF p IS NULL OR p->>'stripe_subscription_id' IS DISTINCT FROM i.stripe_subscription_id OR v_owner IS DISTINCT FROM i.bound_owner_id OR (v_owner IS NOT NULL AND v_owner<>_user AND NOT i.owner_placeholder) THEN RAISE EXCEPTION 'Bound owner cannot be reassigned'; END IF;
 IF i.owner_placeholder AND v_owner IS NOT NULL AND v_owner<>_user AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_owner AND email ILIKE '%@demo.tapaway.local') THEN RAISE EXCEPTION 'Existing real owner cannot be reassigned'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user AND lower(email)=i.intended_email AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified email required'; END IF;
 IF i.hub_kind='personal' AND EXISTS(SELECT 1 FROM public.restaurants WHERE owner_id=_user) OR i.hub_kind='restaurant' AND EXISTS(SELECT 1 FROM public.personal_profiles WHERE user_id=_user) THEN RAISE EXCEPTION 'Account kinds cannot be combined'; END IF;
 v_qty:=CASE WHEN i.selection->>'plan'='venue' THEN 15 ELSE 4 END;
 IF i.hub_kind='personal' THEN
  UPDATE public.personal_profiles SET user_id=_user WHERE id=i.hub_id;
  INSERT INTO public.personal_card_requests(profile_id,user_id,quantity,status,is_addon,stripe_session_id,subscription_invitation_id,shipping_name,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country)
  VALUES(i.hub_id,_user,v_qty,'pending',false,i.stripe_checkout_session_id,i.id,i.shipping_address->>'name',i.shipping_address->>'line1',i.shipping_address->>'line2',i.shipping_address->>'city',i.shipping_address->>'state',i.shipping_address->>'postal_code',i.shipping_address->>'country') ON CONFLICT(subscription_invitation_id) DO NOTHING;
 ELSE
  UPDATE public.restaurants SET owner_id=_user WHERE id=i.hub_id;
  INSERT INTO public.fulfillment_orders(user_id,restaurant_id,plan,quantity,status,stripe_customer_id,stripe_subscription_id,subscription_invitation_id,order_source,shipping_name,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country,stripe_livemode)
  VALUES(_user,i.hub_id,i.selection->>'plan',v_qty,'pending',i.stripe_customer_id,i.stripe_subscription_id,i.id,'optional_subscription',i.shipping_address->>'name',i.shipping_address->>'line1',i.shipping_address->>'line2',i.shipping_address->>'city',i.shipping_address->>'state',i.shipping_address->>'postal_code',i.shipping_address->>'country',i.stripe_livemode) ON CONFLICT(subscription_invitation_id) DO NOTHING;
 END IF;
 UPDATE public.card_club_memberships SET user_id=_user WHERE subscription_invitation_id=i.id;
 UPDATE public.subscription_invitations SET access_user_id=_user,associated_at=now() WHERE id=i.id;
 RETURN jsonb_build_object('associated',true);
END $$;
REVOKE ALL ON FUNCTION public.associate_subscription_invitation(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.associate_subscription_invitation(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.legacy_auto_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cutoff timestamptz; _src text;
BEGIN
  IF nullif(current_setting('tapaway.optional_subscription',true),'') IS NOT NULL AND EXISTS(SELECT 1 FROM public.subscription_invitations WHERE id=nullif(current_setting('tapaway.optional_subscription',true),'')::uuid AND hub_id=NEW.id) THEN RETURN NEW; END IF;
  IF NEW.legacy_allowance OR NEW.legacy_allowance_source IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.stripe_customer_id IS NULL OR COALESCE(NEW.stripe_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.subscription_status,'') NOT IN ('active','trialing') THEN RETURN NEW; END IF;
  IF COALESCE(NEW.email,'') ILIKE '%@demo.tapaway.local' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'personal_profiles' THEN
    _src := to_jsonb(NEW)->>'onboarding_source';
    IF COALESCE(_src,'') LIKE 'payment_first%' THEN RETURN NEW; END IF;
  END IF;
  SELECT payment_first_launch_at INTO _cutoff FROM public.payment_first_config WHERE id = 1;
  IF _cutoff IS NOT NULL AND NEW.created_at >= _cutoff THEN RETURN NEW; END IF;
  NEW.legacy_allowance := true;
  NEW.legacy_allowance_key := NEW.stripe_subscription_id;
  NEW.legacy_allowance_source := 'pre_launch_old_flow';
  NEW.legacy_allowance_granted_at := now();
  INSERT INTO public.legacy_allowance_entitlements (relationship_key, source, record_count)
    VALUES (NEW.stripe_subscription_id, 'pre_launch_old_flow', 1)
    ON CONFLICT (relationship_key) DO UPDATE SET record_count = public.legacy_allowance_entitlements.record_count + 1;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.legacy_auto_grant() FROM PUBLIC, anon, authenticated;

