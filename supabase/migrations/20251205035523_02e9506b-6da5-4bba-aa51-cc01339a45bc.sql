-- Create fulfillment_orders table
CREATE TABLE IF NOT EXISTS public.fulfillment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  plan text NOT NULL,
  quantity integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'awaiting_onboarding',
  shipping_name text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraint for status
ALTER TABLE public.fulfillment_orders 
ADD CONSTRAINT fulfillment_orders_status_check 
CHECK (status IN ('awaiting_onboarding', 'pending', 'shipped', 'cancelled'));

-- Add trigger for updated_at
CREATE TRIGGER update_fulfillment_orders_updated_at
  BEFORE UPDATE ON public.fulfillment_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_fulfillment_orders_user_restaurant 
  ON public.fulfillment_orders (user_id, restaurant_id);

CREATE INDEX idx_fulfillment_orders_status
  ON public.fulfillment_orders (status);

-- Enable RLS
ALTER TABLE public.fulfillment_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own fulfillment orders
CREATE POLICY "Users can view own fulfillment orders"
  ON public.fulfillment_orders
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Super admin can do everything
CREATE POLICY "super_admin_fulfillment_orders"
  ON public.fulfillment_orders
  FOR ALL
  USING (current_user_email() = 'tap@tapaway.co')
  WITH CHECK (current_user_email() = 'tap@tapaway.co');

-- Policy: Admins can view all
CREATE POLICY "Admins can view all fulfillment orders"
  ON public.fulfillment_orders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));