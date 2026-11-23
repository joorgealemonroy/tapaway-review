-- AV Meals: one public hub, customer reviews first, two pickup locations last.
-- Run only after migration 0053, the profile-review and SMS edge handlers, and
-- the matching frontend are deployed. Confirm review OTP sending is configured
-- before enabling the public form; never enable the prior anonymous submit path.
-- Existing profile, location IDs, menu, links, consent and billing stay attached.
BEGIN;

DO $$
DECLARE
  av_profile constant uuid := '45f38528-6c08-4d86-a095-54e1cdef73d9';
  locations_block constant uuid := '94fa99cf-273f-4048-aa26-de8d4099aedc';
  third_location constant uuid := '5e44d809-037a-47c7-9f14-3f585dcbccec';
BEGIN
  IF to_regclass('public.profile_review_identities') IS NULL THEN
    RAISE EXCEPTION 'Deploy verified profile reviews before enabling this hub.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personal_profiles WHERE id=av_profile AND username='avmeals' AND is_approved)
    OR NOT EXISTS (SELECT 1 FROM public.personal_blocks WHERE id=locations_block AND profile_id=av_profile AND block_type='locations' AND content->>'managed'='true') THEN
    RAISE EXCEPTION 'The AV Meals hub changed; inspect before configuring.';
  END IF;
  -- Never archive a newly confirmed real location or replace an edited address.
  IF EXISTS (SELECT 1 FROM public.profile_locations WHERE id=third_location AND profile_id=av_profile AND is_active
    AND (NOT is_placeholder OR nullif(trim(address),'') IS NOT NULL OR name<>'Location 3')) THEN
    RAISE EXCEPTION 'The third AV location has real details; select the two pickup locations first.';
  END IF;
  IF (SELECT count(*) FROM public.profile_locations WHERE profile_id=av_profile AND is_active AND id<>third_location)<>2 THEN
    RAISE EXCEPTION 'Expected exactly two remaining AV pickup locations.';
  END IF;

  INSERT INTO public.profile_review_settings(profile_id,enabled)
    VALUES(av_profile,true)
    ON CONFLICT(profile_id) DO UPDATE SET enabled=true;

  INSERT INTO public.personal_blocks(profile_id,block_type,content,alignment,sort_order,is_active,is_archived)
    SELECT av_profile,'text','{"variant":"customer_reviews","title":"Customer reviews"}'::jsonb,'center',0,true,false
    WHERE NOT EXISTS (SELECT 1 FROM public.personal_blocks WHERE profile_id=av_profile AND block_type='text' AND content->>'variant'='customer_reviews');
  UPDATE public.personal_blocks SET sort_order=0,is_active=true,is_archived=false
    WHERE profile_id=av_profile AND block_type='text' AND content->>'variant'='customer_reviews';

  UPDATE public.personal_blocks
    SET content=content || '{"mode":"pickup","title":"Pickup locations","subtitle":"","ctaLabel":"Get directions","maxLocations":"2"}'::jsonb,
        sort_order=50,is_active=true,is_archived=false
    WHERE id=locations_block AND profile_id=av_profile;
  UPDATE public.personal_blocks SET content=content || '{"mode":"pickup","description":"Choose pickup updates and weekly ordering reminders."}'::jsonb
    WHERE profile_id=av_profile AND block_type='sms_subscribe' AND content->>'managed'='true';

  UPDATE public.profile_locations SET name='Pickup location 1',subtitle='Pickup details coming soon'
    WHERE id='f3deca8b-baf4-4fc9-bc76-e2ada52948a5' AND profile_id=av_profile AND is_placeholder AND address IS NULL AND name='Location 1';
  UPDATE public.profile_locations SET name='Pickup location 2',subtitle='Pickup details coming soon'
    WHERE id='99fc8cd2-b1ba-491a-ba4d-f92dd872f685' AND profile_id=av_profile AND is_placeholder AND address IS NULL AND name='Location 2';
  UPDATE public.profile_locations SET is_active=false
    WHERE id=third_location AND profile_id=av_profile AND is_placeholder AND address IS NULL AND name='Location 3';
END $$;

COMMIT;
