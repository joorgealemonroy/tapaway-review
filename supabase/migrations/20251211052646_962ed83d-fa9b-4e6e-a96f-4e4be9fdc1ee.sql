-- Allow reading analytics_events for demo restaurants
CREATE POLICY "Anyone can view demo restaurant analytics"
ON public.analytics_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = analytics_events.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading google_reviews for demo restaurants
CREATE POLICY "Anyone can view demo restaurant reviews"
ON public.google_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = google_reviews.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading goals for demo restaurants
CREATE POLICY "Anyone can view demo restaurant goals"
ON public.goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = goals.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading restaurant_engagement for demo restaurants
CREATE POLICY "Anyone can view demo restaurant engagement"
ON public.restaurant_engagement
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = restaurant_engagement.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading competitors for demo restaurants
CREATE POLICY "Anyone can view demo restaurant competitors"
ON public.competitors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = competitors.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading review_sentiments for demo restaurants
CREATE POLICY "Anyone can view demo restaurant sentiments"
ON public.review_sentiments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = review_sentiments.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading menu_sections for demo restaurants
CREATE POLICY "Anyone can view demo restaurant menu sections"
ON public.menu_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = menu_sections.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading locations for demo restaurants
CREATE POLICY "Anyone can view demo restaurant locations"
ON public.locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = locations.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);

-- Allow reading coach_ignored for demo restaurants
CREATE POLICY "Anyone can view demo restaurant coach ignored"
ON public.coach_ignored
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = coach_ignored.restaurant_id 
    AND restaurants.is_demo_account = true
  )
);