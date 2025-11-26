-- 1) Add greeting_name column for ALL restaurants
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS greeting_name text;

-- Backfill existing rows so EVERY current restaurant has a greeting
UPDATE public.restaurants
SET greeting_name = COALESCE(greeting_name, restaurant_name)
WHERE greeting_name IS NULL;

-- 2) Default greeting for NEW restaurants (trigger)
CREATE OR REPLACE FUNCTION public.set_default_greeting_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.greeting_name IS NULL THEN
    NEW.greeting_name := NEW.restaurant_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_greeting_name ON public.restaurants;

CREATE TRIGGER set_default_greeting_name
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.set_default_greeting_name();

-- 3) Table for banned words / slurs
CREATE TABLE IF NOT EXISTS public.banned_words (
  word text PRIMARY KEY
);

-- Enable RLS on banned_words (admins only)
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage banned words"
ON public.banned_words
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 4) Function to check if greeting is clean (no banned words)
CREATE OR REPLACE FUNCTION public.is_clean_greeting(input text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF input IS NULL OR length(trim(input)) = 0 THEN
    RETURN true;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.banned_words bw
    WHERE position(lower(bw.word) IN lower(input)) > 0
  );
END;
$$;

-- 5) Constraint so DB REJECTS offensive greetings
ALTER TABLE public.restaurants
DROP CONSTRAINT IF EXISTS greeting_name_clean;

ALTER TABLE public.restaurants
ADD CONSTRAINT greeting_name_clean
CHECK (public.is_clean_greeting(greeting_name));