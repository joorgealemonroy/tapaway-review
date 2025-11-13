-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  restaurant_name TEXT NOT NULL,
  address TEXT,
  email TEXT,
  phone TEXT,
  google_review_url TEXT,
  yelp_review_url TEXT,
  directions_url TEXT,
  instagram_url TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_portal_url TEXT,
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly', 'bundle')),
  subscription_status TEXT DEFAULT 'active',
  next_billing_date TIMESTAMP WITH TIME ZONE,
  header_title TEXT DEFAULT 'How was your visit?',
  header_subtitle TEXT DEFAULT 'We''d love to hear about your experience!',
  menu_title TEXT DEFAULT 'Our Menu',
  fathom_site_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_sections table
CREATE TABLE public.menu_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policies for restaurants (owners can read/update their own, public can read for review hub)
CREATE POLICY "Public can view restaurants for review hub"
ON public.restaurants FOR SELECT
USING (true);

CREATE POLICY "Owners can view their restaurants"
ON public.restaurants FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their restaurants"
ON public.restaurants FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "System can insert restaurants"
ON public.restaurants FOR INSERT
WITH CHECK (true);

-- Policies for menu_sections
CREATE POLICY "Public can view menu sections"
ON public.menu_sections FOR SELECT
USING (true);

CREATE POLICY "Owners can manage menu sections"
ON public.menu_sections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = menu_sections.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Policies for menu_items
CREATE POLICY "Public can view menu items"
ON public.menu_items FOR SELECT
USING (true);

CREATE POLICY "Owners can manage menu items"
ON public.menu_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    JOIN public.menu_sections ON menu_sections.restaurant_id = restaurants.id
    WHERE menu_items.section_id = menu_sections.id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for restaurants
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();