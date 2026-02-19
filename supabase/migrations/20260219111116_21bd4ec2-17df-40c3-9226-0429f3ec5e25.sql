
-- Create nfc_cards table
CREATE TABLE public.nfc_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_code text NOT NULL UNIQUE,
  claim_code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'unclaimed',
  owner_user_id uuid,
  destination_type text NOT NULL DEFAULT 'profile',
  destination_value text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  batch_id text
);

-- Create index for fast lookups
CREATE INDEX idx_nfc_cards_public_code ON public.nfc_cards (public_code);
CREATE INDEX idx_nfc_cards_owner ON public.nfc_cards (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;

-- Public can SELECT limited columns (needed for redirect lookup)
CREATE POLICY "Public can read card status"
  ON public.nfc_cards FOR SELECT
  USING (true);

-- Owner can UPDATE their own cards
CREATE POLICY "Owners can update their cards"
  ON public.nfc_cards FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access nfc_cards"
  ON public.nfc_cards FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create nfc_card_taps table
CREATE TABLE public.nfc_card_taps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.nfc_cards(id) ON DELETE CASCADE,
  tapped_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text
);

CREATE INDEX idx_nfc_card_taps_card_id ON public.nfc_card_taps (card_id);

-- Enable RLS
ALTER TABLE public.nfc_card_taps ENABLE ROW LEVEL SECURITY;

-- Anyone can insert taps (anonymous)
CREATE POLICY "Anyone can insert taps"
  ON public.nfc_card_taps FOR INSERT
  WITH CHECK (true);

-- Owner can view taps for their cards
CREATE POLICY "Owners can view their card taps"
  ON public.nfc_card_taps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nfc_cards
      WHERE nfc_cards.id = nfc_card_taps.card_id
      AND nfc_cards.owner_user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin full access nfc_card_taps"
  ON public.nfc_card_taps FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
