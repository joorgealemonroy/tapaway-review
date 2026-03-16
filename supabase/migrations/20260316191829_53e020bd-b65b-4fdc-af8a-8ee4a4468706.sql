ALTER TABLE personal_links DROP CONSTRAINT IF EXISTS personal_links_display_style_check;
ALTER TABLE personal_links ADD CONSTRAINT personal_links_display_style_check 
  CHECK (display_style = ANY (ARRAY['pill','icon','both','grid']));