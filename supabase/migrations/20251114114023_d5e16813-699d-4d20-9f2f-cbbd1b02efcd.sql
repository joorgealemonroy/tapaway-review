-- Drop old AV tables and create new ones with proper naming
DROP TABLE IF EXISTS public.avm_menu_items CASCADE;
DROP TABLE IF EXISTS public.avm_menu_sections CASCADE;

-- Create av_meal_prep_meals table
CREATE TABLE public.av_meal_prep_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calories INTEGER NOT NULL,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  image_url TEXT NOT NULL,
  order_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

-- Create av_meal_prep_testimonials table
CREATE TABLE public.av_meal_prep_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, quote)
);

-- Add meal_order_url to restaurants if not exists
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS meal_order_url TEXT;

-- Enable RLS
ALTER TABLE public.av_meal_prep_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.av_meal_prep_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for av_meal_prep_meals
CREATE POLICY "Public can view active meals"
ON public.av_meal_prep_meals FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their meals"
ON public.av_meal_prep_meals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = av_meal_prep_meals.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all meals"
ON public.av_meal_prep_meals FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for av_meal_prep_testimonials
CREATE POLICY "Public can view testimonials"
ON public.av_meal_prep_testimonials FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their testimonials"
ON public.av_meal_prep_testimonials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = av_meal_prep_testimonials.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all testimonials"
ON public.av_meal_prep_testimonials FOR ALL
USING (public.has_role(auth.uid(), 'admin'));