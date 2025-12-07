-- Create support_requests table
CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_type TEXT NOT NULL CHECK (request_type IN ('NEW_CARDS', 'MORE_CARDS', 'TECH_ISSUE', 'BILLING', 'OTHER')),
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  quantity_requested INTEGER,
  description TEXT,
  request_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert support requests (public form)
CREATE POLICY "Anyone can insert support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (true);

-- Users can view their own support requests
CREATE POLICY "Users can view their own support requests"
ON public.support_requests
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all support requests
CREATE POLICY "Admins can view all support requests"
ON public.support_requests
FOR SELECT
USING (public.is_admin());

-- Admins can update all support requests
CREATE POLICY "Admins can update all support requests"
ON public.support_requests
FOR UPDATE
USING (public.is_admin());

-- Super admin full access
CREATE POLICY "super_admin_support_requests"
ON public.support_requests
FOR ALL
USING (current_user_email() = 'tap@tapaway.co')
WITH CHECK (current_user_email() = 'tap@tapaway.co');

-- Add trigger for updated_at
CREATE TRIGGER update_support_requests_updated_at
BEFORE UPDATE ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();