-- Add validation trigger for analytics event types
CREATE OR REPLACE FUNCTION validate_event_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type NOT IN ('tap', 'google_click', 'yelp_click', 'directions_click', 'instagram_click', 'menu_view', 'menu_close') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_analytics_event_type
BEFORE INSERT ON analytics_events
FOR EACH ROW EXECUTE FUNCTION validate_event_type();

-- Add index for efficient analytics querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_restaurant_created 
ON analytics_events(restaurant_id, created_at DESC);