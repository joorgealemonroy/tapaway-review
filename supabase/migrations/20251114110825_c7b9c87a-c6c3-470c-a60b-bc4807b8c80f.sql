-- Create AV Meal Preps menu sections table
CREATE TABLE public.avm_menu_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AV Meal Preps menu items table
CREATE TABLE public.avm_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.avm_menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories TEXT,
  details TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AV Meal Preps testimonials table
CREATE TABLE public.avm_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AV Meal Preps trainer bundles table
CREATE TABLE public.avm_trainer_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_label TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Connect with a trainer',
  cta_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AV-specific settings columns to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS avm_question_title TEXT DEFAULT 'How was your meal?',
ADD COLUMN IF NOT EXISTS avm_question_subtitle TEXT DEFAULT 'Share feedback in seconds — no login.',
ADD COLUMN IF NOT EXISTS avm_positive_label TEXT DEFAULT 'Loved it! 💚',
ADD COLUMN IF NOT EXISTS avm_negative_label TEXT DEFAULT 'Could be better';

-- Enable RLS on all AV tables
ALTER TABLE public.avm_menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avm_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avm_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avm_trainer_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avm_menu_sections
CREATE POLICY "Public can view active menu sections"
ON public.avm_menu_sections FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their menu sections"
ON public.avm_menu_sections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = avm_menu_sections.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all menu sections"
ON public.avm_menu_sections FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for avm_menu_items
CREATE POLICY "Public can view active menu items"
ON public.avm_menu_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their menu items"
ON public.avm_menu_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.avm_menu_sections
    JOIN public.restaurants ON restaurants.id = avm_menu_sections.restaurant_id
    WHERE avm_menu_sections.id = avm_menu_items.section_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all menu items"
ON public.avm_menu_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for avm_testimonials
CREATE POLICY "Public can view active testimonials"
ON public.avm_testimonials FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their testimonials"
ON public.avm_testimonials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = avm_testimonials.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all testimonials"
ON public.avm_testimonials FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for avm_trainer_bundles
CREATE POLICY "Public can view active trainer bundles"
ON public.avm_trainer_bundles FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their trainer bundles"
ON public.avm_trainer_bundles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = avm_trainer_bundles.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all trainer bundles"
ON public.avm_trainer_bundles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));