-- Apply with the matching edge functions before enabling checkout. Safe to reapply.
ALTER TABLE public.checkout_intents ADD COLUMN IF NOT EXISTS business_details jsonb;
CREATE TABLE IF NOT EXISTS public.storefront_quotas (
  quota_key text NOT NULL, day date NOT NULL DEFAULT current_date, uses integer NOT NULL DEFAULT 0,
  PRIMARY KEY (quota_key, day)
);
ALTER TABLE public.storefront_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storefront_quotas FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.storefront_take_quota(_key text, _limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used integer;
BEGIN
  IF _limit < 1 OR _limit > 100 OR length(_key) <> 64 THEN RAISE EXCEPTION 'Invalid quota'; END IF;
  DELETE FROM storefront_quotas WHERE day < current_date - 2;
  INSERT INTO storefront_quotas(quota_key, day, uses) VALUES (_key, current_date, 1)
  ON CONFLICT (quota_key, day) DO UPDATE SET uses = storefront_quotas.uses + 1
    WHERE storefront_quotas.uses < _limit
  RETURNING uses INTO used;
  RETURN coalesce(used, -1);
END; $$;
REVOKE ALL ON FUNCTION public.storefront_take_quota(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storefront_take_quota(text, integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.personal_card_orders (
  id uuid PRIMARY KEY,
  personal_profile_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  checkout_token_hash text NOT NULL,
  artwork_hash text NOT NULL,
  artwork_revision uuid NOT NULL DEFAULT gen_random_uuid(),
  artwork_path text,
  manifest_path text,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','checkout_started','paid','refunded','disputed')),
  production_status text NOT NULL DEFAULT 'awaiting_payment' CHECK (production_status IN ('awaiting_payment','needs_review','approved','printed','shipped','on_hold')),
  hub_requested boolean NOT NULL DEFAULT false,
  hub_name text,
  hub_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  destinations jsonb NOT NULL,
  stripe_livemode boolean NOT NULL DEFAULT false,
  stripe_checkout_session_id text UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_payment_intent_id text,
  user_id uuid REFERENCES auth.users(id),
  email text,
  customer_name text,
  shipping_address jsonb,
  tracking text,
  paid_at timestamptz,
  activation_started_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_card_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.personal_card_orders FROM anon, authenticated;
GRANT ALL ON public.personal_card_orders TO service_role;
CREATE INDEX IF NOT EXISTS personal_card_orders_queue_idx ON public.personal_card_orders (production_status, created_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS personal_card_orders_payment_idx ON public.personal_card_orders (stripe_payment_intent_id);
-- Artwork remains private. Only service-role functions create short-lived admin download links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('personal-card-artwork', 'personal-card-artwork', false, 20000000, ARRAY['application/pdf','application/json'])
ON CONFLICT (id) DO NOTHING;

-- Stable card URL survives a customer changing their public hub username.
CREATE OR REPLACE FUNCTION public.personal_card_hub_destination(_order_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.username FROM personal_card_orders o JOIN personal_profiles p ON p.id = o.personal_profile_id
  WHERE o.id = _order_id AND o.status = 'paid' AND o.activated_at IS NOT NULL
    AND o.hub_requested AND o.stripe_livemode AND p.subscription_status = 'active' AND p.is_approved = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.personal_card_hub_destination(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.personal_card_hub_destination(uuid) TO anon, authenticated, service_role;

-- Block permissive policies on other storage buckets from exposing private artwork.
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Private personal card artwork') THEN
CREATE POLICY "Private personal card artwork" ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (bucket_id <> 'personal-card-artwork')
  WITH CHECK (bucket_id <> 'personal-card-artwork');
END IF;
END; $$;
