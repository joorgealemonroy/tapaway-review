-- Apply the pickup layout independently while phone verification is being set up.
-- Run after the matching pickup frontend is deployed. This does not enable reviews.
BEGIN;
DO $$
DECLARE
  av_profile constant uuid := '45f38528-6c08-4d86-a095-54e1cdef73d9';
  locations_block constant uuid := '94fa99cf-273f-4048-aa26-de8d4099aedc';
  third_location constant uuid := '5e44d809-037a-47c7-9f14-3f585dcbccec';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.personal_profiles WHERE id=av_profile AND username='avmeals' AND is_approved)
    OR NOT EXISTS (SELECT 1 FROM public.personal_blocks WHERE id=locations_block AND profile_id=av_profile AND block_type='locations' AND content->>'managed'='true') THEN
    RAISE EXCEPTION 'The AV Meals hub changed; inspect before configuring.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profile_locations WHERE id=third_location AND profile_id=av_profile AND is_active
    AND (NOT is_placeholder OR nullif(trim(address),'') IS NOT NULL OR name<>'Location 3')) THEN
    RAISE EXCEPTION 'The third AV location has real details; select the two pickup locations first.';
  END IF;
  IF (SELECT count(*) FROM public.profile_locations WHERE profile_id=av_profile AND is_active AND id<>third_location)<>2 THEN
    RAISE EXCEPTION 'Expected exactly two remaining AV pickup locations.';
  END IF;
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
