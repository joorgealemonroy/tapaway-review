ALTER TABLE public.card_showcase_items
  ADD COLUMN hub_kind text,
  ADD COLUMN hub_id uuid,
  ADD COLUMN hub_slug text,
  ADD COLUMN hub_screenshot_path text;

ALTER TABLE public.card_showcase_items
  ADD CONSTRAINT card_showcase_items_hub_kind_check
  CHECK (hub_kind IS NULL OR hub_kind IN ('personal', 'restaurant'));

GRANT SELECT ON public.card_showcase_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.card_showcase_items TO authenticated;
GRANT ALL ON public.card_showcase_items TO service_role;