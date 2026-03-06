
-- Add Stripe Connect columns to personal_profiles
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS is_stripe_onboarded BOOLEAN DEFAULT false;

-- Create creator_products table
CREATE TABLE public.creator_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create creator_purchases table
CREATE TABLE public.creator_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.creator_products(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_purchases ENABLE ROW LEVEL SECURITY;

-- RLS for creator_products
CREATE POLICY "Public can view active products"
  ON public.creator_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Creator can view own products"
  ON public.creator_products FOR SELECT
  TO authenticated
  USING (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can insert own products"
  ON public.creator_products FOR INSERT
  TO authenticated
  WITH CHECK (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can update own products"
  ON public.creator_products FOR UPDATE
  TO authenticated
  USING (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can delete own products"
  ON public.creator_products FOR DELETE
  TO authenticated
  USING (creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid()));

-- RLS for creator_purchases: service role inserts via webhook, no public insert
CREATE POLICY "Buyers can view own purchases"
  ON public.creator_purchases FOR SELECT
  TO authenticated
  USING (buyer_email = public.current_user_email());

CREATE POLICY "Creators can view purchases of their products"
  ON public.creator_purchases FOR SELECT
  TO authenticated
  USING (product_id IN (
    SELECT cp.id FROM public.creator_products cp
    WHERE cp.creator_id IN (SELECT id FROM public.personal_profiles WHERE user_id = auth.uid())
  ));

-- Create private storage bucket for digital files
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-files', 'creator-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: creators can upload to their own folder
CREATE POLICY "Creators can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'creator-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Creators can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'creator-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Creators can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'creator-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Updated_at trigger for creator_products
CREATE TRIGGER update_creator_products_updated_at
  BEFORE UPDATE ON public.creator_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
