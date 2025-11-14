-- Add type field to restaurants table to distinguish different client types
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'restaurant';

COMMENT ON COLUMN public.restaurants.type IS 'Client type: restaurant, meal_prep, etc.';

-- Set AV Meal Prep to meal_prep type
UPDATE public.restaurants 
SET type = 'meal_prep' 
WHERE custom_slug = 'avmealpreps';