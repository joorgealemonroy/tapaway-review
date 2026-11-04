CREATE OR REPLACE FUNCTION public.associate_subscription_invitation(_id uuid,_user uuid,_email text)
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
 -- Preserve pre-existing real same-owner relationships, never create a cross-kind claim.
 IF (v_owner IS DISTINCT FROM _user OR i.owner_placeholder) AND (i.hub_kind='personal' AND EXISTS(SELECT 1 FROM public.restaurants WHERE owner_id=_user) OR i.hub_kind='restaurant' AND EXISTS(SELECT 1 FROM public.personal_profiles WHERE user_id=_user)) THEN RAISE EXCEPTION 'Account kinds cannot be combined'; END IF;
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
