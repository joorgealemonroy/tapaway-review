-- Enable RLS
alter table public.restaurants enable row level security;

-- Allow users to INSERT their own restaurant row
drop policy if exists "Users can insert their own restaurant" on public.restaurants;
create policy "Users can insert their own restaurant"
on public.restaurants
for insert
to authenticated
with check (auth.uid() = owner_id);

-- Allow users to SELECT their own restaurant row(s)
drop policy if exists "Users can view their own restaurant" on public.restaurants;
create policy "Users can view their own restaurant"
on public.restaurants
for select
to authenticated
using (auth.uid() = owner_id);

-- Allow users to UPDATE their own restaurant row
drop policy if exists "Users can update their own restaurant" on public.restaurants;
create policy "Users can update their own restaurant"
on public.restaurants
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);