-- Add Card Club addon flag to personal profiles
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS has_card_addon boolean NOT NULL DEFAULT false;

-- Card request tracking table
CREATE TABLE public.personal_card_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  is_addon boolean NOT NULL DEFAULT false,
  shipping_name text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text DEFAULT 'US',
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_card_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own card requests"
  ON public.personal_card_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own card requests"
  ON public.personal_card_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access card requests"
  ON public.personal_card_requests
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());