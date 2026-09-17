REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.card_showcase_items FROM anon;
GRANT SELECT ON public.card_showcase_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_showcase_items TO authenticated;
GRANT ALL ON public.card_showcase_items TO service_role;