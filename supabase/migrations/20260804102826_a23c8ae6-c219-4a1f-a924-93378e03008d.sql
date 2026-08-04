ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS rep_note text,
  ADD COLUMN IF NOT EXISTS rep_note_at timestamptz;