-- Add contact name and photo fields for contact card customization
ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS contact_photo_url text;

-- Update the public view to include new contact fields
DROP VIEW IF EXISTS public.personal_profiles_public;
CREATE VIEW public.personal_profiles_public AS
SELECT 
  id,
  username,
  full_name,
  headline,
  bio,
  profile_photo_url,
  header_type,
  header_color,
  header_image_url,
  background_color,
  pfp_position,
  plan_type,
  subscription_status,
  contact_enabled,
  contact_phone,
  contact_company,
  contact_title,
  contact_address,
  contact_website,
  contact_name,
  contact_photo_url
FROM public.personal_profiles;