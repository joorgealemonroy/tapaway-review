-- Add new fields to restaurants table for enhanced functionality
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug_locked_at TIMESTAMP WITH TIME ZONE;

-- Add unique constraint to custom_slug
ALTER TABLE public.restaurants 
  ADD CONSTRAINT restaurants_custom_slug_unique UNIQUE (custom_slug);

-- Create index on google_place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON public.restaurants(google_place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_demo_account ON public.restaurants(is_demo_account);

-- Add menu_image_url to restaurants for storing uploaded menu images
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS menu_image_url TEXT;