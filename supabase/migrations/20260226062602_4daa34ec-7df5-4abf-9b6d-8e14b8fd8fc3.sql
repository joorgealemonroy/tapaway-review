-- Change default from 'left' to 'center'
ALTER TABLE personal_profiles ALTER COLUMN pfp_position SET DEFAULT 'center';

-- Fix all existing profiles
UPDATE personal_profiles SET pfp_position = 'center' WHERE pfp_position = 'left' OR pfp_position IS NULL;