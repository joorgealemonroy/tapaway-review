-- Drop the existing constraint
ALTER TABLE personal_links 
DROP CONSTRAINT IF EXISTS personal_links_display_style_check;

-- Add updated constraint that includes 'both'
ALTER TABLE personal_links 
ADD CONSTRAINT personal_links_display_style_check 
CHECK (display_style = ANY (ARRAY['pill'::text, 'icon'::text, 'both'::text]));