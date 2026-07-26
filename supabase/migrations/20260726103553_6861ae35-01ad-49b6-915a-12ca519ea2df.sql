
-- Prevent public exposure of paid product file URLs.
DROP POLICY IF EXISTS "Public can view active products" ON public.creator_products;

CREATE OR REPLACE VIEW public.creator_products_public
WITH (security_invoker = true) AS
SELECT
  id, creator_id, title, description, price_cents, product_type,
  cover_image_url, is_active, created_at, updated_at, image_urls,
  long_description, duration_minutes, booking_url
FROM public.creator_products
WHERE is_active = true;

GRANT SELECT ON public.creator_products_public TO anon, authenticated;

-- Re-add table-level public policy but exclude file_url column via a rule?
-- RLS cannot restrict columns, so we keep public reads OFF at the table
-- and expose only the safe view above. Purchases still use the service_role
-- via the download-product edge function to resolve file_url after payment.

-- Since public policy is dropped, allow anon to still read the *view* by
-- granting a bypass policy that returns only safe columns is impossible;
-- the view above uses security_invoker so anon needs SELECT on base table.
-- Re-add a policy restricted to columns via a helper: use a permissive policy
-- but rely on the view definition to filter columns is not enforceable.
-- Instead, switch view to SECURITY DEFINER-like: use a stable function.

DROP VIEW IF EXISTS public.creator_products_public;

CREATE OR REPLACE FUNCTION public.get_public_creator_products(_creator_id uuid)
RETURNS TABLE (
  id uuid, creator_id uuid, title text, description text, price_cents integer,
  product_type text, cover_image_url text, is_active boolean,
  created_at timestamptz, updated_at timestamptz, image_urls text[],
  long_description text, duration_minutes integer, booking_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, creator_id, title, description, price_cents, product_type,
         cover_image_url, is_active, created_at, updated_at, image_urls,
         long_description, duration_minutes, booking_url
  FROM public.creator_products
  WHERE is_active = true AND creator_id = _creator_id
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_creator_products(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_creator_products(uuid) TO anon, authenticated;
