
-- Restaurant SMS subscribers
CREATE TABLE public.restaurant_sms_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  sms_opt_in boolean NOT NULL DEFAULT true,
  sms_opt_in_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rest_sms_subs_restaurant ON public.restaurant_sms_subscribers(restaurant_id);
CREATE INDEX idx_rest_sms_subs_phone ON public.restaurant_sms_subscribers(phone);

ALTER TABLE public.restaurant_sms_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to a restaurant SMS list"
  ON public.restaurant_sms_subscribers
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id)
  );

CREATE POLICY "Owners can view their SMS subscribers"
  ON public.restaurant_sms_subscribers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_sms_subscribers.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Owners can update their SMS subscribers"
  ON public.restaurant_sms_subscribers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_sms_subscribers.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Owners can delete their SMS subscribers"
  ON public.restaurant_sms_subscribers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_sms_subscribers.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Restaurant SMS campaigns
CREATE TABLE public.restaurant_sms_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rest_sms_campaigns_restaurant_created
  ON public.restaurant_sms_campaigns(restaurant_id, created_at DESC);

ALTER TABLE public.restaurant_sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their restaurant SMS campaigns"
  ON public.restaurant_sms_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_sms_campaigns.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Owners can insert their restaurant SMS campaigns"
  ON public.restaurant_sms_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_sms_campaigns.restaurant_id
        AND r.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins full access restaurant SMS campaigns"
  ON public.restaurant_sms_campaigns
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
