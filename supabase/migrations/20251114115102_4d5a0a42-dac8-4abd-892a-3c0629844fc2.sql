-- Create av_trainer_bundles table
CREATE TABLE public.av_trainer_bundles (
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

-- Enable RLS
ALTER TABLE public.av_trainer_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for av_trainer_bundles
CREATE POLICY "Public can view active trainer bundles"
ON public.av_trainer_bundles FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their trainer bundles"
ON public.av_trainer_bundles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = av_trainer_bundles.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all trainer bundles"
ON public.av_trainer_bundles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));