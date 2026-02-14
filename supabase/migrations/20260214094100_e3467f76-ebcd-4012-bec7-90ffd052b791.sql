-- Recreate restaurant_public_info view with phone column
CREATE OR REPLACE VIEW public.restaurant_public_info AS
SELECT id,
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
    avm_negative_label,
    phone
FROM restaurants;

-- Update the event type validation trigger to include phone_click
CREATE OR REPLACE FUNCTION public.validate_event_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_type NOT IN ('tap', 'google_click', 'yelp_click', 'directions_click', 'instagram_click', 'menu_view', 'menu_close', 'phone_click') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$function$;