-- Add contact_email column to personal_profiles
ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS contact_email text;

-- Recreate the public view to include contact_email
DROP VIEW IF EXISTS public.personal_profiles_public;
CREATE VIEW public.personal_profiles_public AS
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
  contact_photo_url
FROM public.personal_profiles;