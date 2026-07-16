drop policy if exists "Admin can read all W9 files"  on storage.objects;
drop policy if exists "Admin can delete W9 files"    on storage.objects;
drop policy if exists "Reps can upload own W9"       on storage.objects;
drop policy if exists "Reps can update own W9"       on storage.objects;

create policy "Strict Admin and Owner Access to Tax Docs"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'rep-tax-docs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'rep-tax-docs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);