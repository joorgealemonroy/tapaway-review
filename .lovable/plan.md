## Issue 1 — Admin sees plain slug URL for unapproved hubs

**File:** `src/pages/UsernameResolver.tsx`

Change the resolver so that when a slug isn't publicly visible AND the current viewer is a verified admin (via `useAdminAccess`), it automatically falls back to reading the row directly from `personal_profiles` and shows the amber "Admin preview" ribbon — no `?admin_preview=1` required.

Public visitors still get 404 for `trialing && !is_approved` hubs. The existing `?admin_preview=1` shortcut stays as a compatibility path.

## Issue 2 — Google Places demos never get a matching background color

Confirmed cause (via DB read): `las-nuevas-islas` has `background_color = #ffffff` because the rep-create flow saves Google's photo URL directly and hard-codes white. Also, `lh3.googleusercontent.com` blocks canvas readback, so even if we tried to sample it we'd get `null`.

Following your architectural guidance: **do the download + re-host on the server**, then sample on the client from our own bucket.

### 2a. `supabase/functions/lookup-place-id/index.ts` — new `photo_hosted` action

Alongside the existing `action: 'photo'`, add `action: 'photo_hosted'`:

1. Resolve the Google photo URL exactly like today.
2. Server-side `fetch()` the image bytes (Edge Function has no browser CORS).
3. Upload via the Storage REST API to `personal-photos/rep-demos/{slug}-{timestamp}.{ext}` using `SUPABASE_SERVICE_ROLE_KEY`.
4. Return `{ photoUri, publicUrl, path }`. If upload fails, return `publicUrl: null` and the raw `photoUri` so the demo can still be created.

### 2b. `src/pages/rep/RepDemoCreate.tsx`

Replace the current `fetchPlacePhoto` call with a call to `photo_hosted`. Then:

- If `publicUrl` is returned, call `sampleBottomEdgeColor(publicUrl)` and use the result as `background_color` (fallback to `#ffffff` if `null`).
- Insert the profile with `profile_photo_url = publicUrl ?? photoUri` and the sampled `background_color`.
- Everything wrapped in try/catch so a sampling or rehost failure never blocks demo creation.

### 2c. Backfill for existing rep-created demos

One-shot repair for profiles where `created_by_rep_id IS NOT NULL`, `profile_photo_url LIKE '%googleusercontent.com%'`, and `background_color = '#ffffff'`:

- Since the original `photoName` isn't stored, we can't re-call Google. Instead the backfill will directly download the current Google URL server-side (works from Node with no CORS), upload to `personal-photos/rep-demos-backfill/{username}.jpg`, then sample the bottom edge from that public URL and update both `profile_photo_url` and `background_color` in the row.
- Executed as a short admin script via the exec tool so it doesn't live as a permanent edge function. Scoped strictly to `created_by_rep_id IS NOT NULL`.

## Files changed

- `supabase/functions/lookup-place-id/index.ts` — add `photo_hosted` action.
- `src/pages/rep/RepDemoCreate.tsx` — call `photo_hosted`, sample color, save both fields.
- `src/pages/UsernameResolver.tsx` — auto admin-preview fallback on plain slug.
- One-shot backfill run (no persistent file).

## Verification

1. Sign in as admin, hit `/las-nuevas-islas` (no query params) → hub renders with amber ribbon. Sign out → 404.
2. Approve → same URL renders publicly, ribbon gone.
3. Create a fresh Sales Partner demo via Google Places → `profile_photo_url` points at `supabase.co/storage/v1/object/public/personal-photos/rep-demos/…`, `background_color` is a color pulled from the banner's bottom edge, phone preview shows a seamless blend.
4. After backfill, `las-nuevas-islas` background matches its banner and the photo URL is hosted on our storage.
