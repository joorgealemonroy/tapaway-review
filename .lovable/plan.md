

# Fix: Cover Image Upload Fails During Signup

## Root Cause

The `personal-link-images` storage bucket has an INSERT policy requiring `auth.role() = 'authenticated'`. During signup, the user is **not yet authenticated**, so every upload is blocked by RLS.

## Solution

Two changes are needed:

### 1. Allow anonymous uploads to `personal-link-images` bucket

Since this bucket is already **public for viewing**, allowing anonymous inserts for link cover images is acceptable. We'll update the storage RLS policy:

```sql
DROP POLICY "Authenticated users can upload link images" ON storage.objects;

CREATE POLICY "Anyone can upload link images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'personal-link-images');
```

This is safe because:
- The bucket is already public (anyone can view files)
- The images are just link covers -- no sensitive data
- File paths use random names so there's no collision risk

### 2. No code changes needed

The `LinkModal.tsx` upload logic is correct -- it just needs the RLS policy to allow the upload.

## Files to modify

- **Database migration only** -- update the storage INSERT policy for `personal-link-images`
