-- Add agreement acceptance fields to sales_reps table
ALTER TABLE public.sales_reps
ADD COLUMN IF NOT EXISTS agreement_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS agreement_version text DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS signature_name text,
ADD COLUMN IF NOT EXISTS signature_at timestamptz;