-- Add acknowledged_payout_policy column to rep_payout_accounts
ALTER TABLE public.rep_payout_accounts
ADD COLUMN IF NOT EXISTS acknowledged_payout_policy boolean DEFAULT false;

-- Create payout history table
CREATE TABLE IF NOT EXISTS public.rep_payout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'pending', 'withheld')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

-- Enable RLS on payout history
ALTER TABLE public.rep_payout_history ENABLE ROW LEVEL SECURITY;

-- RLS: Reps can view their own payout history
CREATE POLICY "Reps can view own payout history"
ON public.rep_payout_history
FOR SELECT
USING (rep_user_id = auth.uid());

-- RLS: Admin full access to payout history
CREATE POLICY "Admin full access to payout history"
ON public.rep_payout_history
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rep_payout_history_rep_user_id ON public.rep_payout_history(rep_user_id);
CREATE INDEX IF NOT EXISTS idx_rep_payout_history_status ON public.rep_payout_history(status);