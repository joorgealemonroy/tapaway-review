-- Create table for rep setup tokens
CREATE TABLE public.rep_setup_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rep_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions)
CREATE POLICY "Service role only" ON public.rep_setup_tokens
  FOR ALL USING (false);

-- Index for fast token lookup
CREATE INDEX idx_rep_setup_tokens_token ON public.rep_setup_tokens(token);
CREATE INDEX idx_rep_setup_tokens_user_expires ON public.rep_setup_tokens(user_id, expires_at);