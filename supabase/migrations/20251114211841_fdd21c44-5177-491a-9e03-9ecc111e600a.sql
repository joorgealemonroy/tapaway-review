-- ==============================
-- 1) Helper: simple is_admin()
-- ==============================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- ==============================
-- 2) RLS for public.restaurants
-- ==============================

-- Drop existing conflicting policies if they exist
drop policy if exists "restaurants_insert_owner" on public.restaurants;
drop policy if exists "restaurants_update_owner" on public.restaurants;
drop policy if exists "restaurants_all_admin" on public.restaurants;

-- Allow owners to INSERT their own restaurant rows
create policy "restaurants_insert_owner"
on public.restaurants
for insert
to authenticated
with check (
  owner_id = auth.uid() or is_admin()
);

-- Allow owners to UPDATE their own restaurant rows
create policy "restaurants_update_owner"
on public.restaurants
for update
to authenticated
using (
  owner_id = auth.uid() or is_admin()
)
with check (
  owner_id = auth.uid() or is_admin()
);

-- =========================================
-- 3) Create / ensure restaurant-logos bucket
-- =========================================
insert into storage.buckets (id, name, public)
values ('restaurant-logos', 'restaurant-logos', true)
on conflict (id) do update
set public = true;

-- =========================================
-- 4) RLS for storage.objects (logo uploads)
-- =========================================

-- Drop existing policies if they exist
drop policy if exists "logos_public_select" on storage.objects;
drop policy if exists "logos_insert_authenticated" on storage.objects;
drop policy if exists "logos_update_authenticated" on storage.objects;

-- Public READ access
create policy "logos_public_select"
on storage.objects
for select
using (bucket_id = 'restaurant-logos');

-- Authenticated upload
create policy "logos_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'restaurant-logos');

-- Authenticated update
create policy "logos_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'restaurant-logos')
with check (bucket_id = 'restaurant-logos');

-- Authenticated delete (in case they want to replace)
create policy "logos_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'restaurant-logos');