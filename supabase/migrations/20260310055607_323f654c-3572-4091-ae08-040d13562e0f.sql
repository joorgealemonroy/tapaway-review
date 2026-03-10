
-- 1. Add columns to personal_profiles
ALTER TABLE public.personal_profiles 
  ADD COLUMN IF NOT EXISTS is_founding_user BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_number INTEGER NULL;

-- 2. Create atomic founding assignment trigger
CREATE OR REPLACE FUNCTION public.assign_founding_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Lock existing founding rows to prevent race conditions
  SELECT COUNT(*) INTO current_count
  FROM public.personal_profiles
  WHERE is_founding_user = true
  FOR UPDATE;

  IF current_count < 1000 THEN
    NEW.is_founding_user := true;
    NEW.founding_number := current_count + 1;
    NEW.plan_type := 'founding_pro';
    NEW.subscription_status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_founding_status
  BEFORE INSERT ON public.personal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_founding_status();

-- 3. Update personal_profiles_public view to include founding fields
CREATE OR REPLACE VIEW public.personal_profiles_public
WITH (security_invoker = true)
AS SELECT id, username, full_name, headline, bio, profile_photo_url,
    header_image_url, header_type, header_color, background_color,
    pfp_position, plan_type, subscription_status, contact_enabled,
    contact_name, contact_phone, contact_email, contact_company,
    contact_title, contact_address, contact_website, contact_photo_url,
    banner_image_url, show_shop_section, is_founding_user, founding_number
FROM public.personal_profiles
WHERE subscription_status = 'active';

-- 4. Create RPC for founding count (public, no auth required)
CREATE OR REPLACE FUNCTION public.get_founding_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.personal_profiles WHERE is_founding_user = true;
$$;
