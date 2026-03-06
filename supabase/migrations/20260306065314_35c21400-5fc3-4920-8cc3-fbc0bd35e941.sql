
-- Add image_urls array to creator_products for gallery images
ALTER TABLE public.creator_products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add show_shop_section toggle to personal_profiles
ALTER TABLE public.personal_profiles ADD COLUMN IF NOT EXISTS show_shop_section BOOLEAN DEFAULT true;
