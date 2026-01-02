-- Create pending_trials table to store pre-checkout trial info
CREATE TABLE public.pending_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  linked_restaurant_id UUID REFERENCES public.restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_trials ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (pre-checkout, no auth yet)
CREATE POLICY "Allow public insert pending trials"
ON public.pending_trials
FOR INSERT
WITH CHECK (true);

-- Allow reading own pending trial by email (for recovery)
CREATE POLICY "Allow reading pending trials by email"
ON public.pending_trials
FOR SELECT
USING (true);

-- Allow updates for activation (service role will handle this)
CREATE POLICY "Allow updates to pending trials"
ON public.pending_trials
FOR UPDATE
USING (true);

-- Create index for email lookups
CREATE INDEX idx_pending_trials_email ON public.pending_trials(email);

-- Create trigger for updated_at
CREATE TRIGGER update_pending_trials_updated_at
BEFORE UPDATE ON public.pending_trials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();