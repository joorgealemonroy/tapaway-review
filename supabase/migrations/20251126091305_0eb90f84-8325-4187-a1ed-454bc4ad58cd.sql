-- Fix search_path for the current_user_email function to prevent security issues
create or replace function public.current_user_email() 
returns text 
language sql 
stable 
security definer
set search_path = public  -- Added to fix security linter warning
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (select email from auth.users where id = auth.uid())
  );
$$;