ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS onboarding_default_billing text NOT NULL DEFAULT 'year';

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_onboarding_default_billing_check;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_onboarding_default_billing_check
  CHECK (onboarding_default_billing IN ('month', 'year'));

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;