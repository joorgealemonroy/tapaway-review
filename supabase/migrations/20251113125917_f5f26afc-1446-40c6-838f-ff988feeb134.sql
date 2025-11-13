-- Create locations table for multi-location support
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  custom_slug TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  google_review_url TEXT,
  yelp_review_url TEXT,
  instagram_url TEXT,
  directions_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Locations policies
CREATE POLICY "Owners can manage their locations"
  ON public.locations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = locations.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all locations"
  ON public.locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active locations"
  ON public.locations FOR SELECT
  USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update menu_sections to support locations
ALTER TABLE public.menu_sections
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_locations_restaurant_id ON public.locations(restaurant_id);
CREATE INDEX idx_locations_custom_slug ON public.locations(custom_slug);
CREATE INDEX idx_menu_sections_location_id ON public.menu_sections(location_id);

-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'on_track',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their goals"
  ON public.goals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = goals.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can view all goals"
  ON public.goals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create competitors table
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_link TEXT,
  current_review_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their competitors"
  ON public.competitors FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = competitors.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can view all competitors"
  ON public.competitors FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create review_sentiments table for AI analysis
CREATE TABLE public.review_sentiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  sentiment_score NUMERIC(3,2),
  platform TEXT NOT NULL,
  reviewer_name TEXT,
  rating INTEGER,
  ai_reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_sentiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their review sentiments"
  ON public.review_sentiments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = review_sentiments.restaurant_id
    AND restaurants.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can view all review sentiments"
  ON public.review_sentiments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add location_id to analytics_events
ALTER TABLE public.analytics_events
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

CREATE INDEX idx_analytics_events_location_id ON public.analytics_events(location_id);