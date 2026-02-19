
-- 1. Drop the NOT NULL constraint on claim_code_hash (not needed for new flow)
ALTER TABLE public.nfc_cards ALTER COLUMN claim_code_hash DROP NOT NULL;
ALTER TABLE public.nfc_cards ALTER COLUMN claim_code_hash SET DEFAULT '';

-- 2. Add unique index on public_code if not already present
CREATE UNIQUE INDEX IF NOT EXISTS idx_nfc_cards_public_code ON public.nfc_cards (public_code);

-- 3. Add validation trigger to prevent re-claiming
CREATE OR REPLACE FUNCTION public.prevent_card_reclaim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent changing a claimed card back to unclaimed
  IF OLD.status = 'claimed' AND NEW.status = 'unclaimed' THEN
    RAISE EXCEPTION 'Cannot re-claim a card that has already been claimed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_card_reclaim_trigger
  BEFORE UPDATE ON public.nfc_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_card_reclaim();
