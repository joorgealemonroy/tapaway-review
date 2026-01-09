-- Add banner_image_url column for optional full-width banner (premium feature)
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;