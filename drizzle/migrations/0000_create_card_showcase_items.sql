CREATE TABLE public.card_showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (char_length(btrim(business_name)) BETWEEN 1 AND 120),
  front_image_path text NOT NULL CHECK (front_image_path LIKE 'card-showcase/%'),
  back_image_path text CHECK (back_image_path IS NULL OR back_image_path LIKE 'card-showcase/%'),
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_showcase_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_showcase_items TO authenticated;
GRANT ALL ON public.card_showcase_items TO service_role;

ALTER TABLE public.card_showcase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads enabled showcase designs"
ON public.card_showcase_items
FOR SELECT
TO anon, authenticated
USING (is_enabled = true OR public.is_admin());

CREATE POLICY "Admins insert showcase designs"
ON public.card_showcase_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update showcase designs"
ON public.card_showcase_items
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete showcase designs"
ON public.card_showcase_items
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE INDEX card_showcase_items_public_order_idx
ON public.card_showcase_items (is_enabled, sort_order, created_at);

CREATE TRIGGER update_card_showcase_items_updated_at
BEFORE UPDATE ON public.card_showcase_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public reads showcase artwork"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'restaurant-logos' AND name LIKE 'card-showcase/%');

CREATE POLICY "Admins upload showcase artwork"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-logos' AND name LIKE 'card-showcase/%' AND public.is_admin());

CREATE POLICY "Admins update showcase artwork"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-logos' AND name LIKE 'card-showcase/%' AND public.is_admin())
WITH CHECK (bucket_id = 'restaurant-logos' AND name LIKE 'card-showcase/%' AND public.is_admin());

CREATE POLICY "Admins delete showcase artwork"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-logos' AND name LIKE 'card-showcase/%' AND public.is_admin());