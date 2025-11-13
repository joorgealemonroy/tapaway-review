-- Add custom slug and analytics tables
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS custom_slug text UNIQUE;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "staff_prompts": {
    "default_instructions": "Be professional and courteous at all times",
    "negative_experience_guidance": "If a guest mentions concerns, empathize and offer to connect them with management",
    "positive_experience_guidance": "Thank guests for positive feedback and encourage them to share their experience"
  }
}'::jsonb;

-- Create analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics_events
CREATE POLICY "Restaurant owners can view their analytics"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = analytics_events.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_created 
  ON public.analytics_events(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug 
  ON public.restaurants(custom_slug);