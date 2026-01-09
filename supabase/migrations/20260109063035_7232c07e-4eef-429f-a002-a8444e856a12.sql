-- Recreate view to include banner_image_url
CREATE OR REPLACE VIEW public.personal_profiles_public AS
SELECT 
  id,
  username,
  full_name,
  headline,
  bio,
  profile_photo_url,
  header_image_url,
  header_type,
  header_color,
  background_color,
  pfp_position,
  plan_type,
  subscription_status,
  contact_enabled,
  contact_name,
  contact_phone,
  contact_email,
  contact_company,
  contact_title,
  contact_address,
  contact_website,
  contact_photo_url,
  banner_image_url
FROM personal_profiles
WHERE subscription_status = 'active';