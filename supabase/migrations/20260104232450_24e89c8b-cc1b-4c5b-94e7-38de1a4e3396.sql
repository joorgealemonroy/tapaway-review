-- Create personal_profiles table for personal TapAway users
CREATE TABLE public.personal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_photo_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'pending',
  plan_type TEXT, -- 'monthly' or 'yearly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personal_links table for storing user links
CREATE TABLE public.personal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'website', 'email', 'payments', 'music'
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personal_analytics table for profile visits
CREATE TABLE public.personal_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'profile_visit',
  visitor_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for personal_profiles
CREATE POLICY "Users can view their own profile"
ON public.personal_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.personal_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.personal_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Public read for profile pages (by username)
CREATE POLICY "Public can view profiles by username"
ON public.personal_profiles FOR SELECT
USING (subscription_status = 'active');

-- RLS policies for personal_links
CREATE POLICY "Users can manage their own links"
ON public.personal_links FOR ALL
USING (
  profile_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid())
);

-- Public can view active links for active profiles
CREATE POLICY "Public can view links for active profiles"
ON public.personal_links FOR SELECT
USING (
  is_active = true AND
  profile_id IN (SELECT id FROM public.personal_profiles WHERE subscription_status = 'active')
);

-- RLS policies for personal_analytics
CREATE POLICY "Users can view their own analytics"
ON public.personal_analytics FOR SELECT
USING (
  profile_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid())
);

-- Anyone can insert analytics (for tracking visits)
CREATE POLICY "Anyone can insert analytics"
ON public.personal_analytics FOR INSERT
WITH CHECK (true);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-photos', 'personal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'personal-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'personal-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'personal-photos');

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.personal_profiles WHERE username = lower(check_username)
  )
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_personal_profiles_updated_at
BEFORE UPDATE ON public.personal_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();