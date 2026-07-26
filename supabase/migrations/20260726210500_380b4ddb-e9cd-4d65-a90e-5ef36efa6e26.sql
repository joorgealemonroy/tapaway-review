
-- ============================================================
-- Public-readable content (anon must SELECT)
-- ============================================================
GRANT SELECT ON public.personal_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_links TO authenticated;
GRANT ALL ON public.personal_links TO service_role;

GRANT SELECT ON public.personal_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_blocks TO authenticated;
GRANT ALL ON public.personal_blocks TO service_role;

GRANT SELECT ON public.personal_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_profiles TO authenticated;
GRANT ALL ON public.personal_profiles TO service_role;

GRANT SELECT ON public.lead_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_forms TO authenticated;
GRANT ALL ON public.lead_forms TO service_role;

GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;

GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

GRANT SELECT ON public.menu_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_sections TO authenticated;
GRANT ALL ON public.menu_sections TO service_role;

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

GRANT SELECT ON public.restaurant_engagement TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_engagement TO authenticated;
GRANT ALL ON public.restaurant_engagement TO service_role;

GRANT SELECT ON public.av_meal_prep_meals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.av_meal_prep_meals TO authenticated;
GRANT ALL ON public.av_meal_prep_meals TO service_role;

GRANT SELECT ON public.av_meal_prep_testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.av_meal_prep_testimonials TO authenticated;
GRANT ALL ON public.av_meal_prep_testimonials TO service_role;

GRANT SELECT ON public.av_trainer_bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.av_trainer_bundles TO authenticated;
GRANT ALL ON public.av_trainer_bundles TO service_role;

GRANT SELECT ON public.creator_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_products TO authenticated;
GRANT ALL ON public.creator_products TO service_role;

GRANT SELECT ON public.creator_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_availability TO authenticated;
GRANT ALL ON public.creator_availability TO service_role;

GRANT SELECT ON public.google_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_reviews TO authenticated;
GRANT ALL ON public.google_reviews TO service_role;

GRANT SELECT ON public.nfc_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfc_cards TO authenticated;
GRANT ALL ON public.nfc_cards TO service_role;

-- ============================================================
-- Public-writable (anon INSERT only; owners manage via authenticated)
-- ============================================================
GRANT INSERT ON public.personal_analytics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_analytics TO authenticated;
GRANT ALL ON public.personal_analytics TO service_role;

GRANT INSERT ON public.lead_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_submissions TO authenticated;
GRANT ALL ON public.lead_submissions TO service_role;

GRANT INSERT ON public.personal_email_captures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_email_captures TO authenticated;
GRANT ALL ON public.personal_email_captures TO service_role;

GRANT INSERT ON public.nfc_card_taps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfc_card_taps TO authenticated;
GRANT ALL ON public.nfc_card_taps TO service_role;

GRANT INSERT ON public.pending_otps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_otps TO authenticated;
GRANT ALL ON public.pending_otps TO service_role;

GRANT INSERT ON public.restaurant_sms_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_sms_subscribers TO authenticated;
GRANT ALL ON public.restaurant_sms_subscribers TO service_role;

GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

GRANT INSERT ON public.rep_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_applications TO authenticated;
GRANT ALL ON public.rep_applications TO service_role;

GRANT INSERT ON public.support_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;

GRANT INSERT ON public.pending_trials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_trials TO authenticated;
GRANT ALL ON public.pending_trials TO service_role;

-- ============================================================
-- Auth-only tables (no anon)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_card_requests TO authenticated;
GRANT ALL ON public.personal_card_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_campaigns TO authenticated;
GRANT ALL ON public.sms_campaigns TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_sms_campaigns TO authenticated;
GRANT ALL ON public.restaurant_sms_campaigns TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_purchases TO authenticated;
GRANT ALL ON public.creator_purchases TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_reps TO authenticated;
GRANT ALL ON public.sales_reps TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_restaurants TO authenticated;
GRANT ALL ON public.rep_restaurants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_demo_requests TO authenticated;
GRANT ALL ON public.rep_demo_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_payout_accounts TO authenticated;
GRANT ALL ON public.rep_payout_accounts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_payout_history TO authenticated;
GRANT ALL ON public.rep_payout_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_tax_profiles TO authenticated;
GRANT ALL ON public.rep_tax_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_setup_tokens TO authenticated;
GRANT ALL ON public.rep_setup_tokens TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_compensation_settings TO authenticated;
GRANT ALL ON public.rep_compensation_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_settings TO authenticated;
GRANT ALL ON public.affiliate_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_abuse_flags TO authenticated;
GRANT ALL ON public.affiliate_abuse_flags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_ignored TO authenticated;
GRANT ALL ON public.coach_ignored TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_sentiments TO authenticated;
GRANT ALL ON public.review_sentiments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fulfillment_orders TO authenticated;
GRANT ALL ON public.fulfillment_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.magic_link_tokens TO authenticated;
GRANT ALL ON public.magic_link_tokens TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_tokens TO authenticated;
GRANT ALL ON public.promo_tokens TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_words TO authenticated;
GRANT ALL ON public.banned_words TO service_role;
