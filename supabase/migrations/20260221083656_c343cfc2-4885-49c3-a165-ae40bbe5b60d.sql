
ALTER TABLE affiliate_settings
  ADD COLUMN commission_free_base numeric NOT NULL DEFAULT 3.00,
  ADD COLUMN commission_free_bonus numeric NOT NULL DEFAULT 5.00,
  ADD COLUMN commission_paid_base numeric NOT NULL DEFAULT 5.00,
  ADD COLUMN commission_paid_bonus numeric NOT NULL DEFAULT 8.00,
  ADD COLUMN bonus_threshold integer NOT NULL DEFAULT 25;

UPDATE affiliate_settings SET
  commission_free_base = 3.00,
  commission_free_bonus = 5.00,
  commission_paid_base = 5.00,
  commission_paid_bonus = 8.00,
  bonus_threshold = 25;
