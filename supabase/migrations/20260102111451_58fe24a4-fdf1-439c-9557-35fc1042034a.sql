-- Create table for custom OTP verification
CREATE TABLE public.pending_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_pending_otps_email_code ON public.pending_otps(email, code);

-- RLS - only edge functions with service role can access
ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
-- This is intentional for security

-- Auto-cleanup old OTPs (optional trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pending_otps 
  WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_otps_on_insert
  AFTER INSERT ON public.pending_otps
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_otps();