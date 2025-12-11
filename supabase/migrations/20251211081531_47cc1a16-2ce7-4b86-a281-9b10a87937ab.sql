-- Add email notification preference to rep_payout_accounts
ALTER TABLE public.rep_payout_accounts
ADD COLUMN IF NOT EXISTS email_payout_notifications boolean NOT NULL DEFAULT true;

-- Add email_sent_at column to rep_payout_history to prevent duplicate emails
ALTER TABLE public.rep_payout_history
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz DEFAULT NULL;