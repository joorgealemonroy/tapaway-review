-- Create rep_tax_profiles table for W-9 onboarding
CREATE TABLE public.rep_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'submitted', 'approved', 'rejected')),
  w9_file_path text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rep_user_id)
);

-- Create index on rep_user_id for fast lookups
CREATE INDEX idx_rep_tax_profiles_rep_user_id ON public.rep_tax_profiles(rep_user_id);

-- Enable RLS
ALTER TABLE public.rep_tax_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Reps can view their own tax profile (limited fields via application logic)
CREATE POLICY "Reps can view own tax profile"
ON public.rep_tax_profiles
FOR SELECT
USING (rep_user_id = auth.uid());

-- Policy: Reps can insert their own tax profile
CREATE POLICY "Reps can insert own tax profile"
ON public.rep_tax_profiles
FOR INSERT
WITH CHECK (rep_user_id = auth.uid());

-- Policy: Reps can update their own tax profile but cannot set approved/rejected status
CREATE POLICY "Reps can update own tax profile"
ON public.rep_tax_profiles
FOR UPDATE
USING (rep_user_id = auth.uid())
WITH CHECK (
  rep_user_id = auth.uid() 
  AND status IN ('missing', 'submitted')
);

-- Policy: Admin has full access
CREATE POLICY "Admin full access to tax profiles"
ON public.rep_tax_profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_rep_tax_profiles_updated_at
BEFORE UPDATE ON public.rep_tax_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage bucket for W-9 files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rep-tax-docs',
  'rep-tax-docs',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Storage policy: Reps can upload only their own files
CREATE POLICY "Reps can upload own W9"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'rep-tax-docs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Reps can update/replace their own files
CREATE POLICY "Reps can update own W9"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'rep-tax-docs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Admin can read all files
CREATE POLICY "Admin can read all W9 files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rep-tax-docs'
  AND is_admin()
);

-- Storage policy: Admin can delete files if needed
CREATE POLICY "Admin can delete W9 files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'rep-tax-docs'
  AND is_admin()
);

-- Create a secure view for reps that only exposes safe fields
CREATE VIEW public.rep_tax_status AS
SELECT
  rep_user_id,
  status,
  CASE WHEN status = 'rejected' THEN note ELSE NULL END as rejection_note,
  created_at,
  updated_at
FROM public.rep_tax_profiles;