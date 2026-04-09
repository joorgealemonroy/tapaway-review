-- Promo tokens for admin-generated discount/free links
CREATE TABLE public.promo_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  discount_type text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_by_user_id uuid,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_promo_discount_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.discount_type NOT IN ('free', '50_off') THEN
    RAISE EXCEPTION 'Invalid discount_type: %. Must be free or 50_off', NEW.discount_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_promo_discount_type
  BEFORE INSERT OR UPDATE ON public.promo_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_promo_discount_type();

ALTER TABLE public.promo_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_promo_tokens" ON public.promo_tokens
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());