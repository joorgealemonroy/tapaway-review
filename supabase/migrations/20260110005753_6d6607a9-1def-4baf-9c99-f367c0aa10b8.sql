-- Create table for magic link tokens
CREATE TABLE IF NOT EXISTS public.magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX idx_magic_link_tokens_hash ON public.magic_link_tokens(token_hash);
CREATE INDEX idx_magic_link_tokens_expires ON public.magic_link_tokens(expires_at);

-- Enable RLS (only service role can access)
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access (which is what we want)