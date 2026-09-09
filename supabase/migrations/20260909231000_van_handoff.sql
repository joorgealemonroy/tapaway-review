-- Van mode: password-setup handoff tracking on personal_profiles.
--
-- send-van-handoff (invoked by verify-personal-checkout after a van sale
-- provisions) generates a single-use, expiring Supabase recovery link and
-- texts/emails it to the owner. It claims exactly-once delivery with an
-- atomic UPDATE ... WHERE van_handoff_sent_at IS NULL, so the 4-second
-- poll from /admin/van can never double-text the owner.
--
-- Idempotent: every statement is safe to re-run.
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS van_handoff_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS van_handoff_channel text;
