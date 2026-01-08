-- Add contact card fields to personal_profiles
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_enabled boolean DEFAULT false;
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_company text;
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_title text;
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_address text;
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS contact_website text;

-- Update the public view to include contact fields
DROP VIEW IF EXISTS personal_profiles_public;
CREATE VIEW personal_profiles_public AS
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
  contact_website
FROM personal_profiles;