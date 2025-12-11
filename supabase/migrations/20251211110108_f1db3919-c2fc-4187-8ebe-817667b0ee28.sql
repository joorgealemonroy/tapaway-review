-- Create rep_demo_requests table
CREATE TABLE public.rep_demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  requested_at timestamptz DEFAULT now(),
  fulfilled boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.rep_demo_requests ENABLE ROW LEVEL SECURITY;

-- Reps can insert their own request
CREATE POLICY "Reps can insert own demo request"
ON public.rep_demo_requests
FOR INSERT
WITH CHECK (rep_user_id = auth.uid());

-- Reps can view their own request
CREATE POLICY "Reps can view own demo request"
ON public.rep_demo_requests
FOR SELECT
USING (rep_user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all demo requests"
ON public.rep_demo_requests
FOR SELECT
USING (is_admin());

-- Admins can update all requests (for marking fulfilled)
CREATE POLICY "Admins can update all demo requests"
ON public.rep_demo_requests
FOR UPDATE
USING (is_admin());