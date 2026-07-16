## Goal

Harden `rep-tax-docs` W-9 storage: keep the bucket strictly private, replace the current split rep/admin policies with one unified strict policy, and confirm the admin dashboard reads files only via short-lived signed URLs. No visual changes.

## Current state

- Bucket `rep-tax-docs` already exists and is private (public: No — confirmed in storage buckets list).
- `storage.objects` has 4 separate policies on this bucket:
  - `Admin can read all W9 files` (SELECT, admin only)
  - `Admin can delete W9 files` (DELETE, admin only)
  - `Reps can upload own W9` (INSERT, folder = auth.uid())
  - `Reps can update own W9` (UPDATE, folder = auth.uid())
- Reps have **no SELECT policy**, so they currently cannot read their own W-9 back — only admins can.
- `AdminTaxReview.tsx` already uses `supabase.storage.from('rep-tax-docs').createSignedUrl(path, 60)` — 60s signed URL. Good.

## Plan

### 1. Migration: replace policies with one strict unified policy

Drop the four existing per-op policies and replace with a single FOR ALL policy that matches the requested spec, so both admin and owning rep have full CRUD on their own folder, and nobody else:

```sql
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
```

Notes on the SQL vs. the version in your message:
- Uses `storage.foldername(name)[1]` (Supabase's helper) instead of `split_part(name, '/', 1)::uuid`. Same first-segment check, safer against non-UUID paths (won't throw on legacy rows) and matches the existing convention already in this project.
- Adds `WITH CHECK` so INSERT/UPDATE are also constrained, not only USING for reads.
- `FOR ALL` covers SELECT, INSERT, UPDATE, DELETE in one policy, replacing the four separate ones.
- Reps regain SELECT on their own folder (previously missing) — needed so a rep can preview or re-download their own W-9 from the rep portal.

### 2. Bucket confirmation (no code change)

`rep-tax-docs` already exists as private. No `storage_create_bucket` / `storage_update_bucket` call needed.

### 3. Admin dashboard signed-URL flow (no code change needed)

`AdminTaxReview.tsx` already:
- Calls `createSignedUrl(profile.w9_file_path, 60)` on demand.
- Opens the resulting URL in a new tab.
- Never exposes a persistent public URL.

That matches the "short-lived signed URLs" requirement. Nothing to change there. Design stays as-is (obsidian-dark work is untouched by this task).

### 4. Verification

After migration approval + run:
- Confirm the four old policies are gone and the new policy exists on `storage.objects`.
- Confirm admin download in `/admin/tax-review` still returns a valid signed URL (no code path changed).
- Note to user: reps can now also read their own W-9 back, which was previously blocked.

## Files / changes

- New migration on `storage.objects` (drop 4 policies, create 1 unified strict policy).
- No app code changes.
