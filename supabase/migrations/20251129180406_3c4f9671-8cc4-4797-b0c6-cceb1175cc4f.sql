-- Add Google review sync columns to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS google_rating numeric,
ADD COLUMN IF NOT EXISTS google_user_ratings_total integer,
ADD COLUMN IF NOT EXISTS last_google_sync_at timestamptz;

-- Create google_reviews table to store individual reviews
CREATE TABLE IF NOT EXISTS public.google_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  source text DEFAULT 'google',
  place_id text,
  author_name text,
  rating numeric NOT NULL,
  text text,
  review_time timestamptz,
  relative_time_description text,
  profile_photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on google_reviews
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- Allow owners to view their own restaurant reviews
CREATE POLICY "Owners can view their restaurant reviews"
ON public.google_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = google_reviews.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Allow admins to view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.google_reviews
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Super admin can manage all reviews
CREATE POLICY "super_admin_google_reviews"
ON public.google_reviews
FOR ALL
TO authenticated
USING (public.current_user_email() = 'tap@tapaway.co')
WITH CHECK (public.current_user_email() = 'tap@tapaway.co');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_google_reviews_restaurant_id ON public.google_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON public.google_reviews(rating);