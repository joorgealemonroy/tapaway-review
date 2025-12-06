-- Update the restaurant_public_info view to include type and hub_background_style
DROP VIEW IF EXISTS restaurant_public_info;

CREATE VIEW restaurant_public_info AS
SELECT 
  id,
  restaurant_name,
  header_title,
  header_subtitle,
  menu_title,
  google_review_url,
  yelp_review_url,
  directions_url,
  instagram_url,
  logo_url,
  custom_slug,
  type,
  hub_background_style,
  custom_background_url,
  avm_question_title,
  avm_question_subtitle,
  avm_positive_label,
  avm_negative_label
FROM restaurants;