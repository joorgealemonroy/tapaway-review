CREATE OR REPLACE VIEW public.personal_profiles_public
WITH (security_invoker=on) AS
SELECT id, user_id, username, full_name, headline, bio, profile_photo_url,
       header_image_url, header_type, header_color, background_color, pfp_position,
       plan_type, subscription_status, contact_enabled, contact_name, contact_phone,
       contact_email, contact_company, contact_title, contact_address, contact_website,
       contact_photo_url, banner_image_url, show_shop_section, is_founding_user,
       founding_number, show_founding_badge, bg_style, vibe_id, button_theme,
       text_color, show_username, contact_display_style, contact_button_label,
       is_approved
FROM public.personal_profiles
WHERE subscription_status = 'active'
   OR (subscription_status = 'trialing' AND is_approved = true);

GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;