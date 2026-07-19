## Google Places Auto-Fill for 1-Click Demo Creation

Replace the current auto-spawning `RepDemoCreate.tsx` behavior with a single Google Places search that enriches the demo profile before dropping the rep into the dashboard.

### 1. Extend `lookup-place-id` edge function

Currently returns only `id`, `displayName`, `formattedAddress`. Broaden the `X-Goog-FieldMask` to also fetch:
- `places.internationalPhoneNumber`
- `places.nationalPhoneNumber`
- `places.websiteUri`
- `places.googleMapsUri`
- `places.photos` (first photo `name` only)

Map into each result:
```
{ placeId, name, formattedAddress, phone, website, googleMapsUri, photoName }
```

Add a companion action (`?action=photo`, or a new `get-place-photo` function) that, given a `photos[].name`, calls `https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=1200&skipHttpRedirect=true` and returns the `photoUri`. Server-side call keeps the API key hidden.

### 2. Rewrite `src/pages/rep/RepDemoCreate.tsx`

Drop the auto-spawn logic. Render a centered dark-theme card with:
- Title "Create a new demo hub"
- Subheading explaining the flow
- Single `GooglePlacesAutocomplete` input (reuses existing component)
- Small helper text about the 50/day cap

When a place is selected → run `handleCreateDemo(place)`:

1. **Daily cap check** (unchanged: count `personal_profiles` for `sales_rep_id` since midnight; if ≥ 50 toast + return).
2. **Fetch enriched details** by re-calling `lookup-place-id` with the exact business name (or extend the current call to already return them so no second round trip is required).
3. **Resolve photo URL** via the photo helper when `photoName` exists; on any failure just skip the photo (never block creation).
4. **Derive unique username** from `place.name`:
   - slugify (`lowercase`, `[^a-z0-9]+` → `-`, trim `-`, cap 32 chars)
   - loop with `is_username_available` RPC, append `-2`, `-3`… until free (max 8 tries, fall back to `demo-<rand>` if all taken)
5. **Insert `personal_profiles`** with:
   - `user_id`: rep's `user.id`
   - `username`, `full_name: place.name`
   - `email: <username>@demo.tapaway.local`
   - `business_phone: place.phone ?? null`
   - `profile_photo_url: resolvedPhotoUrl ?? null`
   - `header_type: 'banner'` (so uploaded/banner photo behaves as banner header per existing rep-demo defaults)
   - `background_color: '#ffffff'`
   - `plan_type: 'solo_pro'`, `subscription_status: 'trialing'`, `trial_ends_at: now() + 7d`
   - `sales_rep_id`, `created_by_rep_id`
   - `is_approved: false`, `pipeline_status: 'draft'`
   - `show_username: true`
6. **Insert two `personal_links` rows** (best-effort — swallow errors, keep flow moving):
   - `{ profile_id, label: 'Visit Our Website', url: place.website, link_type: 'custom', sort_order: 0, is_active: true }` — only if `place.website` is present.
   - `{ profile_id, label: 'Leave us a 5-Star Review', url: place.googleMapsUri, link_type: 'google_review', sort_order: 1, is_active: true }` — only if `googleMapsUri` present.
7. Toast "Demo created — customize away 🎉" and `navigate('/dashboard?profile_id=<new_id>')` (preserving `admin_view_rep` when present, matching current logic).

While the async work is running show the same loader/`Loader2` UI in place of the search card so reps get instant feedback.

### 3. Edge cases

- Search returns no phone/website/photo → still create the profile; just skip the missing fields and any dependent link inserts.
- Photo fetch fails or is CORS-blocked → skip silently, do not throw.
- Slug collision after 8 tries → fall back to `demo-<rand6>` so we never block the rep.
- Legacy `/rep/demo/:id` edit route continues to redirect to `/dashboard?profile_id=<id>` (unchanged).

### Technical notes

- `personal_links.link_type` uses free-form strings — `'custom'` and `'google_review'` already exist in the codebase (`platformLinks`), so no schema changes.
- No DB migrations required — all new fields already exist on `personal_profiles` and `personal_links`.
- Only files touched:
  - `supabase/functions/lookup-place-id/index.ts` (field mask + photo endpoint)
  - `src/pages/rep/RepDemoCreate.tsx` (full rewrite)

### Out of scope

Admin approval queue, pipeline view, and existing dashboard editing behavior stay untouched.