-- Add headline and bio fields to personal_profiles
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS bio text;

-- Add section_header block type support (already supported via block_type text field)