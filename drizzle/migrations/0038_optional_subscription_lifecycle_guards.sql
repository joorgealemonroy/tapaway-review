CREATE OR REPLACE FUNCTION public.legacy_auto_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cutoff timestamptz; _src text;
BEGIN
  IF nullif(current_setting('tapaway.optional_subscription',true),'') IS NOT NULL AND EXISTS(SELECT 1 FROM public.subscription_invitations WHERE id=nullif(current_setting('tapaway.optional_subscription',true),'')::uuid AND hub_id=NEW.id) THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM public.subscription_invitations WHERE hub_id=NEW.id AND stripe_subscription_id=NEW.stripe_subscription_id AND paid_at IS NOT NULL) THEN RETURN NEW; END IF;
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

CREATE FUNCTION public.hold_optional_invitation_cards() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.subscription_invitation_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.subscription_invitations i WHERE i.id=NEW.subscription_invitation_id AND (i.payment_hold_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.payment_reversal_holds h WHERE h.mode=CASE WHEN i.stripe_livemode THEN 'live' ELSE 'test' END AND (h.stripe_payment_intent_id=i.stripe_payment_intent_id OR h.stripe_subscription_id=i.stripe_subscription_id)))) AND NEW.status NOT IN ('shipped','delivered','cancelled','canceled') THEN NEW.status:='on_hold'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hold_optional_invitation_cards() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_hold_optional_personal_cards BEFORE INSERT OR UPDATE ON public.personal_card_requests FOR EACH ROW EXECUTE FUNCTION public.hold_optional_invitation_cards();
CREATE TRIGGER zz_hold_optional_restaurant_cards BEFORE INSERT OR UPDATE ON public.fulfillment_orders FOR EACH ROW EXECUTE FUNCTION public.hold_optional_invitation_cards();
CREATE FUNCTION public.hold_optional_invitation_reversal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.subscription_invitations SET payment_hold_at=COALESCE(payment_hold_at,now()) WHERE stripe_livemode=(NEW.mode='live') AND (stripe_payment_intent_id=NEW.stripe_payment_intent_id OR stripe_subscription_id=NEW.stripe_subscription_id);
 UPDATE public.personal_card_requests SET status='on_hold' WHERE subscription_invitation_id IN (SELECT id FROM public.subscription_invitations WHERE stripe_livemode=(NEW.mode='live') AND payment_hold_at IS NOT NULL) AND status NOT IN ('shipped','delivered','cancelled','canceled');
 UPDATE public.fulfillment_orders SET status='on_hold' WHERE subscription_invitation_id IN (SELECT id FROM public.subscription_invitations WHERE stripe_livemode=(NEW.mode='live') AND payment_hold_at IS NOT NULL) AND status NOT IN ('shipped','delivered','cancelled','canceled');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hold_optional_invitation_reversal() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_hold_optional_invitation AFTER INSERT OR UPDATE ON public.payment_reversal_holds FOR EACH ROW EXECUTE FUNCTION public.hold_optional_invitation_reversal();
