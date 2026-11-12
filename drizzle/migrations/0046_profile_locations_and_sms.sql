-- Fridge locations belong to one editable hub, not to separate subscriptions.
CREATE TABLE IF NOT EXISTS public.profile_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  subtitle text CHECK (length(subtitle)<=240),
  address text CHECK (length(address)<=500),
  directions_url text CHECK (directions_url IS NULL OR (length(directions_url)<=2000 AND directions_url ~ '^https://[^[:space:]<>]+$')),
  image_url text CHECK (image_url IS NULL OR (length(image_url)<=2000 AND image_url ~ '^(https://|/)[^[:space:]<>]+$')),
  is_placeholder boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  restocked_at timestamptz,
  restock_note text CHECK (length(restock_note)<=240),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id,slug), UNIQUE(id,profile_id)
);

CREATE OR REPLACE FUNCTION public.can_manage_profile_locations(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.personal_profiles p WHERE p.id=p_profile_id
    AND (p.user_id=auth.uid() OR public.is_admin()));
$$;
REVOKE ALL ON FUNCTION public.can_manage_profile_locations(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_profile_locations(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.profile_location_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at:=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS profile_location_updated_at ON public.profile_locations;
CREATE TRIGGER profile_location_updated_at BEFORE UPDATE ON public.profile_locations
  FOR EACH ROW EXECUTE FUNCTION public.profile_location_updated_at();
ALTER TABLE public.profile_locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_locations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.profile_locations TO authenticated;
GRANT ALL ON public.profile_locations TO service_role;
CREATE POLICY "Owners manage their hub locations" ON public.profile_locations FOR ALL TO authenticated
  USING(public.can_manage_profile_locations(profile_id)) WITH CHECK(public.can_manage_profile_locations(profile_id));

-- Dedicated merchant sender configuration never enters the public hub payload.
-- The owner can change display/legal copy through a scoped RPC, not approval fields.
CREATE TABLE IF NOT EXISTS public.profile_sms_programs (
  profile_id uuid PRIMARY KEY REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  brand_name text NOT NULL CHECK(length(trim(brand_name)) BETWEEN 1 AND 100),
  frequency_text text NOT NULL DEFAULT 'Message frequency varies.' CHECK(length(frequency_text) BETWEEN 1 AND 200),
  terms_url text NOT NULL DEFAULT '' CHECK(terms_url='' OR (length(terms_url)<=2000 AND terms_url ~ '^https://[^[:space:]<>]+$')),
  privacy_url text NOT NULL DEFAULT '' CHECK(privacy_url='' OR (length(privacy_url)<=2000 AND privacy_url ~ '^https://[^[:space:]<>]+$')),
  consent_version integer NOT NULL DEFAULT 1 CHECK(consent_version>0),
  sender_status text NOT NULL DEFAULT 'pending' CHECK(sender_status IN ('pending','ready','paused')),
  sender_number text CHECK(sender_number IS NULL OR sender_number ~ '^\+[1-9][0-9]{6,14}$'),
  registration_reference text,
  sender_verified_at timestamptz,
  opt_out_webhook_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(sender_status<>'ready' OR (sender_number IS NOT NULL AND nullif(trim(registration_reference),'') IS NOT NULL
    AND sender_verified_at IS NOT NULL AND opt_out_webhook_verified_at IS NOT NULL AND terms_url<>'' AND privacy_url<>''))
);
CREATE UNIQUE INDEX IF NOT EXISTS profile_sms_program_sender_unique ON public.profile_sms_programs(sender_number) WHERE sender_number IS NOT NULL;
ALTER TABLE public.profile_sms_programs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_sms_programs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.profile_sms_programs TO service_role;

CREATE TABLE IF NOT EXISTS public.profile_sms_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL UNIQUE REFERENCES public.personal_email_captures(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK(phone ~ '^\+[1-9][0-9]{6,14}$'),
  ordering_opt_in boolean NOT NULL DEFAULT false,
  ordering_consent_text text,
  ordering_consent_at timestamptz,
  ordering_consent_version integer,
  opted_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id,phone), UNIQUE(id,profile_id)
);
CREATE TABLE IF NOT EXISTS public.profile_location_subscriptions (
  contact_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  location_id uuid NOT NULL,
  consent_text text NOT NULL,
  consent_version integer NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY(contact_id,location_id),
  FOREIGN KEY(contact_id,profile_id) REFERENCES public.profile_sms_contacts(id,profile_id) ON DELETE CASCADE,
  FOREIGN KEY(location_id,profile_id) REFERENCES public.profile_locations(id,profile_id)
);
CREATE TABLE IF NOT EXISTS public.profile_sms_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.profile_sms_contacts(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.profile_locations(id),
  topic text NOT NULL CHECK(topic IN ('restock','ordering','all')),
  action text NOT NULL CHECK(action IN ('opt_in','opt_out')),
  consent_text text,
  consent_version integer,
  source text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_sms_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_location_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_sms_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_sms_contacts,public.profile_location_subscriptions,public.profile_sms_consent_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.profile_sms_contacts,public.profile_location_subscriptions,public.profile_sms_consent_events TO authenticated;
GRANT ALL ON public.profile_sms_contacts,public.profile_location_subscriptions,public.profile_sms_consent_events TO service_role;
CREATE POLICY "Owners read scoped SMS contacts" ON public.profile_sms_contacts FOR SELECT TO authenticated USING(public.can_manage_profile_locations(profile_id));
CREATE POLICY "Owners read scoped location subscriptions" ON public.profile_location_subscriptions FOR SELECT TO authenticated USING(public.can_manage_profile_locations(profile_id));
CREATE POLICY "Owners read scoped consent evidence" ON public.profile_sms_consent_events FOR SELECT TO authenticated USING(public.can_manage_profile_locations(profile_id));

ALTER TABLE public.sms_campaigns ADD COLUMN IF NOT EXISTS campaign_type text CHECK(campaign_type IS NULL OR campaign_type IN ('restock','ordering'));
ALTER TABLE public.sms_campaigns ADD COLUMN IF NOT EXISTS location_id uuid;
ALTER TABLE public.sms_campaigns ADD CONSTRAINT sms_campaign_location_profile_fkey FOREIGN KEY(location_id,profile_id) REFERENCES public.profile_locations(id,profile_id);

CREATE OR REPLACE FUNCTION public.profile_sms_consent_text(p_profile_id uuid,p_topic text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT 'I agree to receive recurring automated marketing text messages from '||p.brand_name||' about '||
   CASE WHEN p_topic='restock' THEN 'restocks at the locations I select' ELSE 'weekly meal ordering and menu updates' END||
   '. '||p.frequency_text||' Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Terms: '||p.terms_url||'. Privacy: '||p.privacy_url||'.'
 FROM public.profile_sms_programs p WHERE p.profile_id=p_profile_id AND p_topic IN ('restock','ordering');
$$;
REVOKE ALL ON FUNCTION public.profile_sms_consent_text(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.profile_sms_consent_text(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_profile_locations(p_profile_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN public.personal_profile_is_active(p_profile_id) THEN COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'id',l.id,'slug',l.slug,'name',l.name,'subtitle',l.subtitle,'address',l.address,'directions_url',l.directions_url,
   'image_url',l.image_url,'is_placeholder',l.is_placeholder,'is_active',l.is_active,'sort_order',l.sort_order,
   'restocked_at',CASE WHEN NOT l.is_placeholder THEN l.restocked_at END,
   'restock_note',CASE WHEN NOT l.is_placeholder THEN l.restock_note END)
   ORDER BY l.sort_order,l.created_at) FROM public.profile_locations l WHERE l.profile_id=p_profile_id AND l.is_active),'[]'::jsonb) ELSE '[]'::jsonb END;
$$;
CREATE OR REPLACE FUNCTION public.get_public_profile_sms_program(p_profile_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('brand_name',p.brand_name,'frequency_text',p.frequency_text,'terms_url',p.terms_url,
   'privacy_url',p.privacy_url,'consent_version',p.consent_version,'sender_ready',p.sender_status='ready',
   'signup_ready',p.terms_url<>'' AND p.privacy_url<>'','restock_consent_text',public.profile_sms_consent_text(p.profile_id,'restock'),
   'ordering_consent_text',public.profile_sms_consent_text(p.profile_id,'ordering'))
 FROM public.profile_sms_programs p WHERE p.profile_id=p_profile_id AND public.personal_profile_is_active(p.profile_id);
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_locations(uuid),public.get_public_profile_sms_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_locations(uuid),public.get_public_profile_sms_program(uuid) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.record_profile_location_sms_opt_in(p_profile_id uuid,p_location_id uuid,p_phone text,p_name text,
  p_restock_consent boolean,p_ordering_consent boolean,p_consent_version integer,p_user_agent text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE program public.profile_sms_programs%ROWTYPE; contact public.profile_sms_contacts%ROWTYPE;
  capture uuid; accepted_at timestamptz:=now(); restock_text text; ordering_text text;
BEGIN
  SELECT * INTO program FROM public.profile_sms_programs WHERE profile_id=p_profile_id;
  IF NOT FOUND OR NOT public.personal_profile_is_active(p_profile_id) THEN RAISE EXCEPTION 'This hub is unavailable' USING ERRCODE='22023'; END IF;
  IF program.terms_url='' OR program.privacy_url='' THEN RAISE EXCEPTION 'Text signup is still being prepared' USING ERRCODE='22023'; END IF;
  IF p_consent_version IS DISTINCT FROM program.consent_version THEN RAISE EXCEPTION 'Please refresh the signup form and review the updated consent' USING ERRCODE='22023'; END IF;
  IF p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{6,14}$' OR length(p_name)>100 OR length(p_user_agent)>500
    OR NOT (COALESCE(p_restock_consent,false) OR COALESCE(p_ordering_consent,false)) THEN
    RAISE EXCEPTION 'Please check your phone number and text preferences' USING ERRCODE='22023'; END IF;
  IF p_location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profile_locations l WHERE l.id=p_location_id AND l.profile_id=p_profile_id AND l.is_active) THEN
    RAISE EXCEPTION 'This location is unavailable' USING ERRCODE='22023'; END IF;
  IF p_restock_consent IS TRUE AND NOT EXISTS(SELECT 1 FROM public.profile_locations l WHERE l.id=p_location_id AND l.profile_id=p_profile_id AND l.is_active AND NOT l.is_placeholder) THEN
    RAISE EXCEPTION 'Choose an available location for restock alerts' USING ERRCODE='22023'; END IF;
  -- Serialize only this hub/phone. A repeated scan adds preferences to the same contact.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text||':'||p_phone,0));
  SELECT * INTO contact FROM public.profile_sms_contacts WHERE profile_id=p_profile_id AND phone=p_phone FOR UPDATE;
  IF contact.id IS NULL THEN
    INSERT INTO public.personal_email_captures(profile_id,name,phone,sms_opt_in,sms_opt_in_at,sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in)
    VALUES(p_profile_id,nullif(trim(p_name),''),p_phone,true,accepted_at,true,accepted_at,false) RETURNING id INTO capture;
    INSERT INTO public.profile_sms_contacts(profile_id,capture_id,phone) VALUES(p_profile_id,capture,p_phone) RETURNING * INTO contact;
  ELSE
    UPDATE public.personal_email_captures SET name=COALESCE(nullif(trim(p_name),''),name),sms_opt_in=true,sms_opt_in_at=accepted_at,
      sms_marketing_opt_in=true,sms_marketing_opt_in_at=accepted_at WHERE id=contact.capture_id AND profile_id=p_profile_id AND phone=p_phone;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contact data changed. Please contact this business.' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public.profile_sms_contacts SET opted_out_at=NULL,updated_at=accepted_at WHERE id=contact.id;
  IF p_restock_consent IS TRUE THEN
    restock_text:=public.profile_sms_consent_text(p_profile_id,'restock');
    INSERT INTO public.profile_location_subscriptions(contact_id,profile_id,location_id,consent_text,consent_version,consented_at,revoked_at)
    VALUES(contact.id,p_profile_id,p_location_id,restock_text,program.consent_version,accepted_at,NULL)
    ON CONFLICT(contact_id,location_id) DO UPDATE SET consent_text=EXCLUDED.consent_text,consent_version=EXCLUDED.consent_version,consented_at=EXCLUDED.consented_at,revoked_at=NULL;
    INSERT INTO public.profile_sms_consent_events(profile_id,contact_id,location_id,topic,action,consent_text,consent_version,source,user_agent)
    VALUES(p_profile_id,contact.id,p_location_id,'restock','opt_in',restock_text,program.consent_version,'hub-location:'||p_location_id::text,p_user_agent);
  END IF;
  IF p_ordering_consent IS TRUE THEN
    ordering_text:=public.profile_sms_consent_text(p_profile_id,'ordering');
    UPDATE public.profile_sms_contacts SET ordering_opt_in=true,ordering_consent_text=ordering_text,ordering_consent_at=accepted_at,
      ordering_consent_version=program.consent_version WHERE id=contact.id;
    INSERT INTO public.profile_sms_consent_events(profile_id,contact_id,location_id,topic,action,consent_text,consent_version,source,user_agent)
    VALUES(p_profile_id,contact.id,p_location_id,'ordering','opt_in',ordering_text,program.consent_version,'hub:'||p_profile_id::text,p_user_agent);
  END IF;
  RETURN contact.id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_profile_location_sms_opt_in(uuid,uuid,text,text,boolean,boolean,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_location_sms_opt_in(uuid,uuid,text,text,boolean,boolean,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_profile_location_sms_recipients(p_profile_id uuid,p_campaign_type text,p_location_id uuid DEFAULT NULL)
RETURNS TABLE(phone text,capture_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_campaign_type NOT IN ('restock','ordering') OR p_campaign_type IS NULL OR (p_campaign_type='ordering' AND p_location_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Choose a valid text audience' USING ERRCODE='22023'; END IF;
  IF p_location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profile_locations l WHERE l.id=p_location_id AND l.profile_id=p_profile_id AND l.is_active AND NOT l.is_placeholder) THEN
    RAISE EXCEPTION 'This location is unavailable' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT c.phone,c.capture_id FROM public.profile_sms_contacts c
    JOIN public.profile_sms_programs p ON p.profile_id=c.profile_id
    JOIN public.personal_email_captures e ON e.id=c.capture_id AND e.profile_id=c.profile_id AND e.phone=c.phone
    WHERE c.profile_id=p_profile_id AND c.opted_out_at IS NULL AND e.sms_opt_in IS TRUE AND e.sms_marketing_opt_in IS TRUE
    AND ((p_campaign_type='ordering' AND c.ordering_opt_in AND c.ordering_consent_version=p.consent_version)
      OR (p_campaign_type='restock' AND EXISTS(SELECT 1 FROM public.profile_location_subscriptions s
        JOIN public.profile_locations l ON l.id=s.location_id AND l.profile_id=s.profile_id
        WHERE s.contact_id=c.id AND s.profile_id=c.profile_id AND s.revoked_at IS NULL AND s.consent_version=p.consent_version
          AND l.is_active AND NOT l.is_placeholder AND (p_location_id IS NULL OR s.location_id=p_location_id))))
    ORDER BY c.phone;
END $$;
REVOKE ALL ON FUNCTION public.get_profile_location_sms_recipients(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_location_sms_recipients(uuid,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.profile_location_sms_recipient_allowed(p_profile_id uuid,p_phone text,p_campaign_type text,p_location_id uuid,p_sender_number text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.get_profile_location_sms_recipients(p_profile_id,p_campaign_type,p_location_id) r WHERE r.phone=p_phone)
 AND public.personal_profile_is_active(p_profile_id)
 AND EXISTS(SELECT 1 FROM public.profile_sms_programs p WHERE p.profile_id=p_profile_id AND p.sender_status='ready' AND p.sender_number=p_sender_number);
$$;
REVOKE ALL ON FUNCTION public.profile_location_sms_recipient_allowed(uuid,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.profile_location_sms_recipient_allowed(uuid,text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_profile_location_sms(p_sender_number text,p_phone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_profile uuid; contact public.profile_sms_contacts%ROWTYPE; revoked timestamptz:=now();
BEGIN
  SELECT profile_id INTO target_profile FROM public.profile_sms_programs WHERE sender_number=p_sender_number;
  IF target_profile IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_profile::text||':'||p_phone,0));
  SELECT * INTO contact FROM public.profile_sms_contacts WHERE profile_id=target_profile AND phone=p_phone FOR UPDATE;
  IF contact.id IS NOT NULL THEN
    UPDATE public.profile_sms_contacts SET opted_out_at=revoked,ordering_opt_in=false,updated_at=revoked WHERE id=contact.id;
    UPDATE public.profile_location_subscriptions SET revoked_at=revoked WHERE contact_id=contact.id AND revoked_at IS NULL;
    UPDATE public.personal_email_captures SET sms_opt_in=false,sms_marketing_opt_in=false,sms_transactional_opt_in=false WHERE id=contact.capture_id;
    INSERT INTO public.profile_sms_consent_events(profile_id,contact_id,topic,action,source)
    VALUES(target_profile,contact.id,'all','opt_out','verified-twilio-stop');
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.revoke_profile_location_sms(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_profile_location_sms(text,text) TO service_role;

-- Old shared-number campaigns retain their original opt-out behavior, while
-- dedicated merchant programs are excluded in the same database statement.
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
REVOKE ALL ON FUNCTION public.revoke_legacy_shared_sms(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_legacy_shared_sms(text) TO service_role;

CREATE OR REPLACE FUNCTION public.update_profile_sms_program(p_profile_id uuid,p_brand_name text,p_frequency_text text,p_terms_url text,p_privacy_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_manage_profile_locations(p_profile_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF length(trim(p_brand_name)) NOT BETWEEN 1 AND 100 OR length(trim(p_frequency_text)) NOT BETWEEN 1 AND 200
    OR (p_terms_url<>'' AND (length(p_terms_url)>2000 OR p_terms_url !~ '^https://[^[:space:]<>]+$'))
    OR (p_privacy_url<>'' AND (length(p_privacy_url)>2000 OR p_privacy_url !~ '^https://[^[:space:]<>]+$')) THEN
    RAISE EXCEPTION 'Please check the SMS program details' USING ERRCODE='22023'; END IF;
  UPDATE public.profile_sms_programs SET brand_name=trim(p_brand_name),frequency_text=trim(p_frequency_text),terms_url=p_terms_url,privacy_url=p_privacy_url,
    consent_version=consent_version+1,sender_status='pending',sender_verified_at=NULL,updated_at=now()
    WHERE profile_id=p_profile_id AND (brand_name,frequency_text,terms_url,privacy_url) IS DISTINCT FROM (trim(p_brand_name),trim(p_frequency_text),p_terms_url,p_privacy_url);
END $$;
REVOKE ALL ON FUNCTION public.update_profile_sms_program(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_profile_sms_program(uuid,text,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_profile_sms_dashboard(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE program public.profile_sms_programs%ROWTYPE; result jsonb;
BEGIN
  IF NOT public.can_manage_profile_locations(p_profile_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO program FROM public.profile_sms_programs WHERE profile_id=p_profile_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'program',jsonb_build_object('brand_name',program.brand_name,'frequency_text',program.frequency_text,'terms_url',program.terms_url,
      'privacy_url',program.privacy_url,'consent_version',program.consent_version,'sender_status',program.sender_status,'sender_ready',program.sender_status='ready'),
    'audience',jsonb_build_object(
      'total',(SELECT count(*) FROM (SELECT phone FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',NULL) UNION SELECT phone FROM public.get_profile_location_sms_recipients(p_profile_id,'ordering',NULL)) q),
      'restock',(SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',NULL)),
      'ordering',(SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'ordering',NULL))),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'subscriber_count',
      CASE WHEN l.is_active AND NOT l.is_placeholder THEN (SELECT count(*) FROM public.get_profile_location_sms_recipients(p_profile_id,'restock',l.id)) ELSE 0 END)
      ORDER BY l.sort_order,l.created_at) FROM public.profile_locations l WHERE l.profile_id=p_profile_id),'[]'::jsonb),
    'campaigns',COALESCE((SELECT jsonb_agg(q ORDER BY q.created_at DESC) FROM (SELECT c.id,c.message,c.recipient_count,c.success_count,c.failure_count,c.created_at,c.campaign_type,c.location_id
      FROM public.sms_campaigns c WHERE c.profile_id=p_profile_id ORDER BY c.created_at DESC LIMIT 20) q),'[]'::jsonb)) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_profile_sms_dashboard(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_profile_sms_dashboard(uuid) TO authenticated,service_role;
