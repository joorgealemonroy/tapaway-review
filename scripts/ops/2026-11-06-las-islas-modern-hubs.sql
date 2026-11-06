-- Authorized two-location migration. Run in one transaction after support migration.
-- Keep the original IDs, owners, billing contracts and audit/history records.
BEGIN;
DO $$
DECLARE r restaurants%ROWTYPE; s personal_profiles%ROWTYPE; n integer;
BEGIN
  SELECT * INTO STRICT s FROM personal_profiles WHERE id='ed9c16da-72a1-4a96-b8e5-ed384c1e78d1' AND username='islasmarias';
  FOR r IN SELECT * FROM restaurants WHERE id IN ('aff3e306-8ccf-4c55-b33f-88da2d17bba8','e0e6ff46-9574-4df8-84bd-94ecedfbd4fd') ORDER BY id FOR UPDATE LOOP
    IF EXISTS(SELECT 1 FROM legacy_hub_migrations WHERE restaurant_id=r.id) THEN CONTINUE; END IF;
    IF r.owner_id IS DISTINCT FROM '875c4312-7f6c-46cb-ba69-86d1becd7d65'::uuid OR r.custom_slug NOT IN ('lasislasfontana','lasislasmarias') OR r.subscription_status IS DISTINCT FROM 'active' OR NOT r.is_approved THEN RAISE EXCEPTION 'Source hub changed; review required'; END IF;
    IF EXISTS(SELECT 1 FROM personal_profiles WHERE id=r.id OR username IN (r.custom_slug,r.custom_slug||'-new',r.custom_slug||'-legacy')) OR EXISTS(SELECT 1 FROM restaurants WHERE custom_slug=r.custom_slug||'-legacy') THEN RAISE EXCEPTION 'Destination collision'; END IF;
    INSERT INTO personal_profiles(id,user_id,username,full_name,email,profile_photo_url,header_type,header_color,background_color,pfp_position,button_theme,logo_scale,logo_bg_color,show_username,contact_enabled,contact_company,contact_name,contact_phone,contact_address,contact_display_style,plan_type,subscription_status,payment_state,stripe_customer_id,stripe_subscription_id,trial_ends_at,is_approved,approved_at,pipeline_status,source,onboarding_source,legacy_allowance,legacy_allowance_key,legacy_allowance_source,legacy_allowance_granted_at,google_place_id,formatted_address,business_phone,created_at)
    VALUES(r.id,r.owner_id,r.custom_slug||'-new','',r.email,s.profile_photo_url,'logo',s.header_color,s.background_color,s.pfp_position,s.button_theme,s.logo_scale,s.logo_bg_color,false,true,r.restaurant_name,r.restaurant_name,r.phone,r.address,'icon',r.plan_type,r.subscription_status,r.payment_state,r.stripe_customer_id,r.stripe_subscription_id,r.trial_ends_at,true,now(),'activated','legacy_restaurant_migration','legacy_restaurant_migration',r.legacy_allowance,r.legacy_allowance_key,r.legacy_allowance_source,r.legacy_allowance_granted_at,r.google_place_id,r.address,r.phone,r.created_at);
    INSERT INTO legacy_hub_migrations(restaurant_id,profile_id,original_slug,restaurant_snapshot) VALUES(r.id,r.id,r.custom_slug,to_jsonb(r));

    INSERT INTO personal_links(profile_id,link_type,label,url,sort_order,cover_image_url,display_style,grid_size)
      SELECT r.id,'instagram','Instagram',r.instagram_url,0,cover_image_url,'pill','half' FROM personal_links WHERE profile_id=s.id AND link_type='instagram' LIMIT 1;
    INSERT INTO personal_links(profile_id,link_type,label,url,sort_order,cover_image_url,display_style,grid_size)
      SELECT r.id,'phone','Place An Order','tel:'||regexp_replace(r.phone,'[^0-9+]','','g'),1,cover_image_url,'pill','half' FROM personal_links WHERE profile_id=s.id AND link_type='phone' LIMIT 1;
    INSERT INTO personal_blocks(profile_id,block_type,content,sort_order)
      VALUES(r.id,'sms_subscribe','{"buttonText":"Join the VIP List","style":"button"}'::jsonb,2);
    -- Preserve explicit consent and timestamps verbatim; never infer consent.
    INSERT INTO personal_email_captures(id,profile_id,name,phone,created_at,sms_opt_in,sms_opt_in_at,sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in,sms_transactional_opt_in_at)
      SELECT id,r.id,name,phone,created_at,sms_opt_in,sms_opt_in_at,sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in,sms_transactional_opt_in_at
      FROM restaurant_sms_subscribers WHERE restaurant_id=r.id;
    INSERT INTO personal_links(profile_id,link_type,label,url,sort_order) VALUES
      (r.id,'website','View Menu · Ver Menú','https://tapaway.co/__l5e/assets-v1/2f7f1134-a5db-4402-8873-0a4bd263e4db/las-islas-menu-mar26.pdf',3),
      (r.id,'directions','Get Directions',r.directions_url,4),
      (r.id,'google_review','Leave us a Review',r.google_review_url,5),
      (r.id,'yelp','Check Us Out On Yelp',r.yelp_review_url,6);
    -- The original rows remain the immutable source of historical activity.
    -- Only canonical event scope changes; event IDs, counts and validation do not.
    UPDATE analytics_hits SET hub_kind='solo' WHERE hub_kind='business' AND hub_id=r.id;
    UPDATE restaurants SET custom_slug=r.custom_slug||'-legacy',logo_url=s.profile_photo_url WHERE id=r.id;
    UPDATE personal_profiles SET username=r.custom_slug WHERE id=r.id;
    SELECT count(*) INTO n FROM personal_links WHERE profile_id=r.id;
    IF n<>6 THEN RAISE EXCEPTION 'Expected six preserved links, found %',n; END IF;
  END LOOP;
  SELECT count(*) INTO n FROM personal_profiles WHERE id IN ('aff3e306-8ccf-4c55-b33f-88da2d17bba8','e0e6ff46-9574-4df8-84bd-94ecedfbd4fd') AND username IN ('lasislasfontana','lasislasmarias') AND is_approved AND subscription_status='active';
  IF n<>2 THEN RAISE EXCEPTION 'Both migrated hubs must be live'; END IF;
END $$;
COMMIT;
