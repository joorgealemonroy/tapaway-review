-- Add phone column to personal_email_captures table
ALTER TABLE public.personal_email_captures
  ADD COLUMN phone text;

-- Make email nullable since users can now choose to collect only phone
ALTER TABLE public.personal_email_captures 
  ALTER COLUMN email DROP NOT NULL;

-- Add a check constraint to ensure at least email OR phone is provided
ALTER TABLE public.personal_email_captures
  ADD CONSTRAINT email_or_phone_required 
  CHECK (email IS NOT NULL OR phone IS NOT NULL);