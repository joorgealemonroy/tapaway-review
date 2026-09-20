-- LOW (claim-card): VIP plan grants require a verified paid-order link.
-- nfc_cards had no order linkage at all, so any holder of a VIP public code
-- could claim a free VIP plan + active status. Admins now record the paid
-- order reference when generating VIP cards; claim-card only upgrades the
-- profile when the link is present.

ALTER TABLE public.nfc_cards
  ADD COLUMN IF NOT EXISTS paid_order_ref text;
