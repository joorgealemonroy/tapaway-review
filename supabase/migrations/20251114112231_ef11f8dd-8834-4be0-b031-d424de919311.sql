-- Simplify AV menu structure - remove sections, make items flat
-- Drop old tables if they exist and recreate with simpler structure

-- Drop old tables (cascade will handle dependencies)
DROP TABLE IF EXISTS public.avm_menu_items CASCADE;
DROP TABLE IF EXISTS public.avm_menu_sections CASCADE;
DROP TABLE IF EXISTS public.avm_testimonials CASCADE;
DROP TABLE IF EXISTS public.avm_trainer_bundles CASCADE;

-- Create simplified AV menu items table (no sections)
CREATE TABLE public.avm_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calories_label TEXT,
  image_url TEXT,
  order_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AV-specific fields to restaurants if they don't exist
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS avm_default_order_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Enable RLS on avm_menu_items
ALTER TABLE public.avm_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avm_menu_items
CREATE POLICY "Public can view active menu items"
ON public.avm_menu_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their menu items"
ON public.avm_menu_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = avm_menu_items.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all menu items"
ON public.avm_menu_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));