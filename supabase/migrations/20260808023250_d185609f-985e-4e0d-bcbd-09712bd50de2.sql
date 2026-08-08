CREATE POLICY "Owners can view their menu sections"
ON public.menu_sections FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_sections.restaurant_id AND r.owner_id = auth.uid()));

CREATE POLICY "Owners can view their menu items"
ON public.menu_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.menu_sections s
  JOIN public.restaurants r ON r.id = s.restaurant_id
  WHERE s.id = menu_items.section_id AND r.owner_id = auth.uid()
));

CREATE POLICY "Admins can manage menu sections"
ON public.menu_sections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage menu items"
ON public.menu_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));