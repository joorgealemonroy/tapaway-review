ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS van_handoff_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS van_handoff_channel text;