-- 1) Create app_settings table for global configuration
CREATE TABLE public.app_settings (
  id text PRIMARY KEY,
  paywall_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the global settings row
INSERT INTO public.app_settings (id, paywall_enabled) VALUES ('global', true);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read app_settings"
ON public.app_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS: Only super admin can update settings
CREATE POLICY "Super admin can update app_settings"
ON public.app_settings
FOR UPDATE
USING (current_user_email() = 'tap@tapaway.co')
WITH CHECK (current_user_email() = 'tap@tapaway.co');

-- 2) Add is_legacy_user column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN is_legacy_user boolean NOT NULL DEFAULT false;

-- Set all existing restaurants as legacy users
UPDATE public.restaurants SET is_legacy_user = true WHERE is_legacy_user = false;

-- Add trigger to update updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();