-- Scope public reads on testimonials to approved restaurants.
DROP POLICY IF EXISTS "Public can view testimonials" ON public.av_meal_prep_testimonials;
CREATE POLICY "Public can view approved testimonials"
  ON public.av_meal_prep_testimonials
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = av_meal_prep_testimonials.restaurant_id
      AND r.is_approved = true
  ));

-- Scope public reads on creator availability to approved/active creator profiles.
DROP POLICY IF EXISTS "Public can view availability" ON public.creator_availability;
CREATE POLICY "Public can view availability for active creators"
  ON public.creator_availability
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.personal_profiles p
    WHERE p.id = creator_availability.creator_id
      AND p.is_approved = true
      AND p.subscription_status = 'active'
  ));