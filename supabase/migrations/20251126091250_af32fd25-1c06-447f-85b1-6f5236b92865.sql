------------------------------------------------------------------------
-- STEP 1 — CREATE A PUBLIC FUNCTION TO READ JWT EMAIL
-- We can't modify auth schema, so create in public schema
------------------------------------------------------------------------
create or replace function public.current_user_email() 
returns text 
language sql 
stable 
security definer
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (select email from auth.users where id = auth.uid())
  );
$$;


------------------------------------------------------------------------
-- STEP 2 — UNIVERSAL SUPER ADMIN POLICY FOR ALL TABLES
-- This automatically gives tap@tapaway.co FULL ACCESS to every table.
------------------------------------------------------------------------

-- First, enable RLS on all tables automatically (safe even if already enabled)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END$$;

-- Now apply the super admin RLS policy globally to every public table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format($policy$
      CREATE POLICY "super_admin_%I"
      ON public.%I
      FOR ALL
      USING (public.current_user_email() = 'tap@tapaway.co')
      WITH CHECK (public.current_user_email() = 'tap@tapaway.co');
    $policy$, r.tablename, r.tablename);
  END LOOP;
END$$;