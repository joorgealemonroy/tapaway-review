ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS card_check_status text,
  ADD COLUMN IF NOT EXISTS card_check_message text;