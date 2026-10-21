-- Public hubs use the existing allowlisted RPC, never raw account rows.
-- Owner, assigned-rep and admin policies remain untouched.
ALTER FUNCTION public.get_public_personal_profile(text) SECURITY DEFINER;
ALTER FUNCTION public.get_public_personal_profile(text) SET search_path=public;
DROP POLICY IF EXISTS "Public can view approved active profiles" ON public.personal_profiles;

-- Preserve the exact public booking condition without exposing account columns.
CREATE OR REPLACE FUNCTION public.creator_booking_is_public(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.personal_profiles WHERE id=_profile_id AND is_approved IS TRUE AND subscription_status='active');
$$;
REVOKE ALL ON FUNCTION public.creator_booking_is_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_booking_is_public(uuid) TO anon,authenticated,service_role;
DROP POLICY IF EXISTS "Public can view availability for active creators" ON public.creator_availability;
CREATE POLICY "Public can view availability for active creators" ON public.creator_availability FOR SELECT TO anon,authenticated USING(public.creator_booking_is_public(creator_id));

-- Older published clients may still write the legacy analytics table. Retain
-- that compatibility without restoring anonymous access to personal_profiles.
DROP POLICY IF EXISTS "Anyone can insert valid personal analytics" ON public.personal_analytics;
CREATE POLICY "Anyone can insert valid personal analytics" ON public.personal_analytics FOR INSERT TO anon,authenticated WITH CHECK(public.personal_profile_is_active(profile_id));

-- Paid setup drafts stay private until approval. The production preflight found
-- no currently entitled profile without approval, so this preserves live hubs.
CREATE OR REPLACE FUNCTION public.hub_access_allowed(_status text,_approved boolean,_payment text,_trial_end timestamptz,_created timestamptz,_subscription text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT _approved IS TRUE AND ((_payment='complimentary') OR _status='active' OR
   (_status='trialing' AND (
     (_subscription IS NOT NULL AND COALESCE(_trial_end,_created+interval '14 days')>now())
     OR (_subscription IS NULL AND _created<=timestamptz '2026-10-21 03:34:37+00')
   )));
$$;
