-- Create rep_payout_accounts table for secure ACH bank details
CREATE TABLE public.rep_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_name text NOT NULL,
  payee_type text NOT NULL CHECK (payee_type IN ('individual', 'business')),
  bank_name text,
  routing_number text NOT NULL,
  account_number text NOT NULL,
  account_last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_user_id)
);

-- Create index on rep_user_id
CREATE INDEX idx_rep_payout_accounts_rep_user_id ON public.rep_payout_accounts(rep_user_id);

-- Enable RLS
ALTER TABLE public.rep_payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Reps can view their own payout account (but we'll filter sensitive fields in the query)
CREATE POLICY "Reps can view own payout account"
ON public.rep_payout_accounts
FOR SELECT
USING (rep_user_id = auth.uid());

-- Reps can insert their own payout account
CREATE POLICY "Reps can insert own payout account"
ON public.rep_payout_accounts
FOR INSERT
WITH CHECK (rep_user_id = auth.uid());

-- Reps can update their own payout account
CREATE POLICY "Reps can update own payout account"
ON public.rep_payout_accounts
FOR UPDATE
USING (rep_user_id = auth.uid())
WITH CHECK (rep_user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access to payout accounts"
ON public.rep_payout_accounts
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_rep_payout_accounts_updated_at
  BEFORE UPDATE ON public.rep_payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view that hides sensitive fields for rep display
CREATE VIEW public.rep_payout_display AS
SELECT 
  id,
  rep_user_id,
  payee_name,
  payee_type,
  bank_name,
  account_last4,
  created_at,
  updated_at
FROM public.rep_payout_accounts;