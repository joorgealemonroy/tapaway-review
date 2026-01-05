-- Create table for captured emails from profile visitors
CREATE TABLE public.personal_email_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_email_captures ENABLE ROW LEVEL SECURITY;

-- Profile owners can view emails captured on their profile
CREATE POLICY "Profile owners can view their captured emails"
ON public.personal_email_captures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE id = profile_id AND user_id = auth.uid()
  )
);

-- Anyone can submit their email (public form)
CREATE POLICY "Anyone can submit email captures"
ON public.personal_email_captures
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_email_captures_profile_id ON public.personal_email_captures(profile_id);
CREATE INDEX idx_email_captures_created_at ON public.personal_email_captures(created_at DESC);