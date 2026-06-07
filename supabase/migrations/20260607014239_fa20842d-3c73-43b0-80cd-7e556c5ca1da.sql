
-- ===== 1. PERSONAL_PROFILES: drop broad public policy; replace with safe public view =====
DROP POLICY IF EXISTS "Public can view profiles by username" ON public.personal_profiles;

DROP VIEW IF EXISTS public.personal_profiles_public;
CREATE VIEW public.personal_profiles_public
WITH (security_invoker = false) AS
SELECT
  id, username, full_name, headline, bio,
  profile_photo_url, header_image_url, header_type, header_color,
  background_color, pfp_position, plan_type, subscription_status,
  contact_enabled, contact_name, contact_phone, contact_email,
  contact_company, contact_title, contact_address, contact_website,
  contact_photo_url, banner_image_url, show_shop_section,
  is_founding_user, founding_number, show_founding_badge,
  bg_style, vibe_id, button_theme, text_color, show_username,
  contact_display_style, contact_button_label
FROM public.personal_profiles
WHERE subscription_status = 'active';

GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;

-- ===== 2. NFC_CARDS: restrict public reads to a safe view =====
DROP POLICY IF EXISTS "Public can read card status" ON public.nfc_cards;

-- Owner can still read full row
CREATE POLICY "Owners can read their cards"
  ON public.nfc_cards FOR SELECT
  USING (owner_user_id = auth.uid());

-- Public-safe view for tap resolution by public_code
CREATE OR REPLACE VIEW public.nfc_cards_public
WITH (security_invoker = false) AS
SELECT
  id, public_code, status, destination_type, destination_value, card_type
FROM public.nfc_cards;

GRANT SELECT ON public.nfc_cards_public TO anon, authenticated;

-- SECURITY DEFINER helper so public profile page can check "hasActiveCard"
-- without exposing owner_user_id mappings.
CREATE OR REPLACE FUNCTION public.profile_has_active_card(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nfc_cards
    WHERE owner_user_id = _user_id AND status = 'claimed'
  );
$$;
REVOKE ALL ON FUNCTION public.profile_has_active_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_has_active_card(uuid) TO anon, authenticated;

-- ===== 3. BOOKINGS: restrict public reads to safe slot-blocking view =====
DROP POLICY IF EXISTS "Public can view bookings for slot blocking" ON public.bookings;

CREATE POLICY "Creators can view own bookings"
  ON public.bookings FOR SELECT
  USING (creator_id IN (
    SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()
  ));

CREATE OR REPLACE VIEW public.bookings_public
WITH (security_invoker = false) AS
SELECT product_id, booking_date, start_time, status, timezone, created_at
FROM public.bookings;

GRANT SELECT ON public.bookings_public TO anon, authenticated;

-- ===== 4. PENDING_TRIALS: require authenticated session =====
DROP POLICY IF EXISTS "Users can view own pending trial" ON public.pending_trials;
CREATE POLICY "Users can view own pending trial"
  ON public.pending_trials FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (lower(email) = lower(public.current_user_email()) OR public.is_admin())
  );

-- ===== 5. CREATOR_PURCHASES: require authenticated session =====
DROP POLICY IF EXISTS "Buyers can view own purchases" ON public.creator_purchases;
CREATE POLICY "Buyers can view own purchases"
  ON public.creator_purchases FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND buyer_email = public.current_user_email()
  );

-- ===== 6. STORAGE: personal-link-images — require auth + owner folder =====
DROP POLICY IF EXISTS "Anyone can upload link images" ON storage.objects;
CREATE POLICY "Auth users upload own link images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personal-link-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 7. STORAGE: restaurant-logos — drop overly broad authenticated DELETE/UPDATE/upload =====
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- ===== 8. Lock down SECURITY DEFINER helpers not meant to be publicly callable =====
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_archives() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_by_email(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_signup_dropoff_stats(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.build_google_review_url(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_google_review_url_valid(text) FROM anon, PUBLIC;
