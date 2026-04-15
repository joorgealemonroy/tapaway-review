-- Allow owners to delete their own restaurants
CREATE POLICY "Owners can delete their restaurants"
ON public.restaurants
FOR DELETE
USING (auth.uid() = owner_id);

-- Add 'card' to the display_style CHECK constraint
ALTER TABLE public.personal_links DROP CONSTRAINT IF EXISTS personal_links_display_style_check;
ALTER TABLE public.personal_links ADD CONSTRAINT personal_links_display_style_check
  CHECK (display_style IS NULL OR display_style IN ('pill', 'icon', 'both', 'grid', 'card'));