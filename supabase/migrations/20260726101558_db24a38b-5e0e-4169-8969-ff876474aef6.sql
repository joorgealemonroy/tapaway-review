
-- Menu sections: restrict public reads to approved restaurants only
DROP POLICY IF EXISTS "Public can view menu sections" ON public.menu_sections;
DROP POLICY IF EXISTS "Anyone can view demo restaurant menu sections" ON public.menu_sections;
CREATE POLICY "Public can view menu sections for approved restaurants"
ON public.menu_sections FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = menu_sections.restaurant_id
      AND r.is_approved = true
  )
);

-- Menu items: restrict public reads to approved restaurants only
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items for approved restaurants"
ON public.menu_items FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_sections s
    JOIN public.restaurants r ON r.id = s.restaurant_id
    WHERE s.id = menu_items.section_id
      AND r.is_approved = true
  )
);

-- Affiliate settings: remove public read; keep admin-only
DROP POLICY IF EXISTS "Public can read affiliate_settings" ON public.affiliate_settings;
REVOKE SELECT ON public.affiliate_settings FROM anon;
-- Authenticated retain SELECT so admin dashboard queries succeed under is_admin() policy.
