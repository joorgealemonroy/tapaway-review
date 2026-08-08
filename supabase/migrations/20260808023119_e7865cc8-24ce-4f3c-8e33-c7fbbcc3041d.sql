CREATE OR REPLACE FUNCTION public.get_public_restaurant_menu(_restaurant_id uuid)
RETURNS TABLE(
  id uuid,
  restaurant_id uuid,
  name text,
  sort_order integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    s.restaurant_id,
    s.name,
    s.sort_order,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order)
      FROM public.menu_items i
      WHERE i.section_id = s.id
    ), '[]'::jsonb) AS items
  FROM public.menu_sections s
  JOIN public.restaurants r ON r.id = s.restaurant_id
  WHERE s.restaurant_id = _restaurant_id
    AND r.is_approved = true
  ORDER BY s.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_restaurant_menu(uuid) TO anon, authenticated;