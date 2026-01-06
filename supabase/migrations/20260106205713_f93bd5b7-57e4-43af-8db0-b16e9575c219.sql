-- Add card confirmation and editable text columns to personal_profiles
ALTER TABLE public.personal_profiles
ADD COLUMN IF NOT EXISTS card_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS card_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS card_front_headline text DEFAULT 'Tap to Connect
& Collaborate',
ADD COLUMN IF NOT EXISTS card_back_text text DEFAULT 'Tap to Connect';