CREATE TABLE public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message text NOT NULL,
  stack_trace text,
  component_stack text,
  route text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.client_errors TO anon;
GRANT INSERT, SELECT ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Ownership is derived server-side from the JWT; anything the client sends is ignored.
CREATE OR REPLACE FUNCTION public.set_client_error_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_client_error_user_trigger
BEFORE INSERT ON public.client_errors
FOR EACH ROW EXECUTE FUNCTION public.set_client_error_user();

CREATE POLICY "Anyone can report a client error"
ON public.client_errors FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read client errors"
ON public.client_errors FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete client errors"
ON public.client_errors FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE INDEX client_errors_created_at_idx ON public.client_errors (created_at DESC);