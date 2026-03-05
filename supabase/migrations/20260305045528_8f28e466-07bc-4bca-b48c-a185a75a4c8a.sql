
ALTER TABLE public.nfc_cards DISABLE TRIGGER USER;

UPDATE public.nfc_cards
SET status = 'unclaimed',
    owner_user_id = NULL,
    destination_type = 'profile',
    destination_value = NULL,
    claimed_at = NULL
WHERE public_code = '6CQ9P4';

ALTER TABLE public.nfc_cards ENABLE TRIGGER USER;
