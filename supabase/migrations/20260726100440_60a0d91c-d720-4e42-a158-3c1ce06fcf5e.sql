
-- ============================================================
-- 1. STORAGE: personal-link-images ownership + personal-photos delete
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can delete link images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update link images" ON storage.objects;

CREATE POLICY "Owners update own link images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'personal-link-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
)
WITH CHECK (
  bucket_id = 'personal-link-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

CREATE POLICY "Owners delete own link images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'personal-link-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.personal_profiles p
      WHERE p.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  )
);

-- personal-photos: add missing DELETE for owners + admin
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'personal-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

-- ============================================================
-- 2. PUBLIC-SCHEMA RLS: dedupe, scope roles, tighten WITH CHECK
-- ============================================================

-- app_settings: drop 2 duplicate SELECTs, add single scoped SELECT
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Public can read app_settings"
ON public.app_settings FOR SELECT TO anon, authenticated
USING (true);

-- affiliate_settings
DROP POLICY IF EXISTS "Anyone can read affiliate_settings" ON public.affiliate_settings;
CREATE POLICY "Public can read affiliate_settings"
ON public.affiliate_settings FOR SELECT TO anon, authenticated
USING (true);

-- av_meal_prep_testimonials
DROP POLICY IF EXISTS "Public can view testimonials" ON public.av_meal_prep_testimonials;
CREATE POLICY "Public can view testimonials"
ON public.av_meal_prep_testimonials FOR SELECT TO anon, authenticated
USING (true);

-- creator_availability
DROP POLICY IF EXISTS "Public can view availability" ON public.creator_availability;
CREATE POLICY "Public can view availability"
ON public.creator_availability FOR SELECT TO anon, authenticated
USING (true);

-- menu_items
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items"
ON public.menu_items FOR SELECT TO anon, authenticated
USING (true);

-- menu_sections
DROP POLICY IF EXISTS "Public can view menu sections" ON public.menu_sections;
CREATE POLICY "Public can view menu sections"
ON public.menu_sections FOR SELECT TO anon, authenticated
USING (true);

-- Open INSERT policies: scope role + add WITH CHECK guards
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
CREATE POLICY "Anyone can create bookings"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (product_id IS NOT NULL AND creator_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit leads" ON public.lead_submissions;
CREATE POLICY "Anyone can submit leads"
ON public.lead_submissions FOR INSERT TO anon, authenticated
WITH CHECK (form_id IS NOT NULL AND profile_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert taps" ON public.nfc_card_taps;
CREATE POLICY "Anyone can insert taps"
ON public.nfc_card_taps FOR INSERT TO anon, authenticated
WITH CHECK (card_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert pending trial" ON public.pending_trials;
CREATE POLICY "Anyone can insert pending trial"
ON public.pending_trials FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND business_name IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit email captures" ON public.personal_email_captures;
CREATE POLICY "Anyone can submit email captures"
ON public.personal_email_captures FOR INSERT TO anon, authenticated
WITH CHECK (profile_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert applications" ON public.rep_applications;
CREATE POLICY "Anyone can insert applications"
ON public.rep_applications FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND name IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can subscribe to a restaurant SMS list" ON public.restaurant_sms_subscribers;
CREATE POLICY "Anyone can subscribe to a restaurant SMS list"
ON public.restaurant_sms_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (restaurant_id IS NOT NULL AND phone IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert support requests" ON public.support_requests;
CREATE POLICY "Anyone can insert support requests"
ON public.support_requests FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND request_type IS NOT NULL);

-- ============================================================
-- 3. magic_link_tokens: explicit deny for clients (server-only)
-- ============================================================

CREATE POLICY "No direct client access"
ON public.magic_link_tokens FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- ============================================================
-- 4. Views: switch definer views to security_invoker
-- ============================================================

ALTER VIEW public.nfc_cards_public SET (security_invoker = true);
ALTER VIEW public.bookings_public SET (security_invoker = true);
ALTER VIEW public.personal_profiles_public SET (security_invoker = true);

-- ============================================================
-- 5. SECURITY DEFINER function grants
-- ============================================================

-- Revoke from PUBLIC for every custom SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.assign_founding_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.build_google_review_url(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_create_bonus() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_archives() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_founding_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_restaurant_hub(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_signup_dropoff_stats(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_affiliate() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_clean_greeting(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_google_review_url_valid(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_sales_rep() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_test_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.personal_profile_is_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_card_reclaim() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_has_active_card(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_default_greeting_name() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_google_review_url() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_event_type() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_promo_discount_type() FROM PUBLIC;

-- Also revoke from anon/authenticated to reset, then re-grant precisely
REVOKE EXECUTE ON FUNCTION public.assign_founding_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_create_bonus() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_by_email(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_signup_dropoff_stats(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_card_reclaim() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_default_greeting_name() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_google_review_url() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_event_type() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promo_discount_type() FROM anon, authenticated;

-- Authenticated + service_role: signed-in helpers used in RLS/client
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_affiliate() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_test_account() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.personal_profile_is_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_has_active_card(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clean_greeting(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_google_review_url_valid(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_google_review_url(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_archives() TO authenticated, service_role;

-- anon + authenticated + service_role: public onboarding/hub reads
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_founding_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_hub(text, uuid) TO anon, authenticated, service_role;

-- service_role only: admin/server privileged helpers
GRANT EXECUTE ON FUNCTION public.get_auth_user_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_signup_dropoff_stats(integer) TO service_role;

-- Trigger functions: only server needs to invoke; triggers fire under table owner regardless
GRANT EXECUTE ON FUNCTION public.assign_founding_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_create_bonus() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otps() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_card_reclaim() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_default_greeting_name() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_google_review_url() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_event_type() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_promo_discount_type() TO service_role;
