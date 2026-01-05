-- Add new columns to personal_profiles for customization
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS header_type text DEFAULT 'color',
ADD COLUMN IF NOT EXISTS header_color text DEFAULT '#6BCB77',
ADD COLUMN IF NOT EXISTS header_image_url text,
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS pfp_position text DEFAULT 'left';

-- Add pill_color to personal_links for custom styling
ALTER TABLE public.personal_links 
ADD COLUMN IF NOT EXISTS pill_color text;

-- Create personal_blocks table for content blocks
CREATE TABLE IF NOT EXISTS public.personal_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  alignment text DEFAULT 'center',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on personal_blocks
ALTER TABLE public.personal_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for personal_blocks
CREATE POLICY "Users can view their own blocks"
  ON public.personal_blocks FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own blocks"
  ON public.personal_blocks FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own blocks"
  ON public.personal_blocks FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own blocks"
  ON public.personal_blocks FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()
    )
  );

-- Public can read active blocks for active profiles
CREATE POLICY "Public can view blocks on active profiles"
  ON public.personal_blocks FOR SELECT
  USING (
    is_active = true AND
    profile_id IN (
      SELECT id FROM public.personal_profiles WHERE subscription_status = 'active'
    )
  );

-- Create admin_audit_log for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write audit log
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin());