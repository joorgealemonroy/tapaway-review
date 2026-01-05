-- Add display_style column to personal_links table
-- 'pill' = default button style, 'icon' = small circular icon in social bar
ALTER TABLE public.personal_links 
ADD COLUMN display_style TEXT DEFAULT 'pill' CHECK (display_style IN ('pill', 'icon'));