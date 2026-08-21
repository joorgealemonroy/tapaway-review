ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS banner_aspect text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS banner_original_url text;

ALTER TABLE public.personal_profiles
  DROP CONSTRAINT IF EXISTS personal_profiles_banner_aspect_check;

ALTER TABLE public.personal_profiles
  ADD CONSTRAINT personal_profiles_banner_aspect_check
  CHECK (banner_aspect IN ('short','standard','tall'));