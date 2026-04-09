-- Drop the unique constraint on user_id to allow multi-profile support
ALTER TABLE public.personal_profiles DROP CONSTRAINT IF EXISTS personal_profiles_user_id_key;

-- Add a regular (non-unique) index for performance
CREATE INDEX IF NOT EXISTS idx_personal_profiles_user_id ON public.personal_profiles (user_id);