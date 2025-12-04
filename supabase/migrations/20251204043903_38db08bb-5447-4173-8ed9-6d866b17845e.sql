-- Add onboarding_step column to track progress
-- This allows users to resume onboarding where they left off
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;

-- Add onboarding_completed flag
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

COMMENT ON COLUMN public.restaurants.onboarding_step IS 'Current onboarding step (1-4). Null or 0 means not started.';
COMMENT ON COLUMN public.restaurants.onboarding_completed IS 'True when user has completed all onboarding steps.';