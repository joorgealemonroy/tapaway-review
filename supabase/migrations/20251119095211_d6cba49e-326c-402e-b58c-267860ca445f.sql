-- Create restaurant_engagement table for promotions and polls
CREATE TABLE public.restaurant_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('promotion', 'poll')),
  content TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_restaurant_engagement_restaurant_active 
ON public.restaurant_engagement(restaurant_id, is_active);

-- Enable RLS
ALTER TABLE public.restaurant_engagement ENABLE ROW LEVEL SECURITY;

-- Owners can manage their engagement
CREATE POLICY "Owners can manage their engagement"
ON public.restaurant_engagement
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = restaurant_engagement.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Public can view active engagement
CREATE POLICY "Public can view active engagement"
ON public.restaurant_engagement
FOR SELECT
USING (is_active = true);

-- Admins can manage all engagement
CREATE POLICY "Admins can manage all engagement"
ON public.restaurant_engagement
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_restaurant_engagement_updated_at
BEFORE UPDATE ON public.restaurant_engagement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add custom_background_url column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS custom_background_url TEXT;