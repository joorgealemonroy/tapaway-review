
## Goal

Every demo hub a sales partner creates must be a **Business Lite (Solo) account** — the exact same product a Solo owner claims and edits — not the legacy `restaurants` dashboard (Overview / Replies / Engagement / Menu / SMS / Settings / Support / Billing). The rep's demo builder must be visually and functionally the same editor a Solo owner uses (draggable interleaved blocks + links, hero editor, design tab).

## Current state (verified)

- `src/pages/rep/RepDemoCreate.tsx` inserts into `public.restaurants` with `plan_type` implicitly Plus. The claimed account then boots into the restaurant dashboard (Overview/Menu/SMS/etc.).
- `src/pages/rep/RepBusinesses.tsx` and `src/pages/rep/RepHome.tsx` also read from `restaurants` for pipeline counts + status.
- `supabase/functions/create-rep-onboarding/index.ts` already knows how to create a Solo account in `personal_profiles` with `plan_type: 'solo_pro'` — so the target schema is proven.
- The Solo editor is composed of `DashboardHeroEditor` + `DashboardUnifiedContent` (drag-and-drop interleaved links/blocks via `useTouchHoldDrag`) + `DashboardDesignTab`, wired to `personal_profiles` / `personal_links` / `personal_blocks`.

## Changes

### 1. Rep demo creation writes to `personal_profiles` (Business Lite Solo)

Rewrite `RepDemoCreate.tsx` to persist to Solo tables instead of `restaurants`:
- Insert one row into `personal_profiles` with:
  - `plan_type: 'solo_pro'`, `subscription_status: 'trialing'`, `trial_ends_at = now + 5 days`
  - `is_approved: false` (admin gate stays)
  - `sales_rep_id`, `created_by_rep_id` = current rep's `user.id`
  - `owner_user_id: null` until claimed
  - `username` = slugified business name (reuse existing slugify)
  - `full_name`, `headline` / `bio`, `profile_photo_url` (logo), `header_image_url` (banner), `header_type`, `background_color`, primary/secondary color tokens
- Persist links into `personal_links` and image blocks into `personal_blocks` with the same `sort_order` interleaving the Solo dashboard uses.
- Drop the legacy `restaurants` fields (`menu_title`, `restaurant_name`, `owner_phone`, `yelp_review_url`, `google_place_id`, etc.) from the insert payload. Business phone + Google Place ID move into `personal_profiles.settings` since Solo profiles don't surface a Reviews tab.

Migration for schema deltas (only what's actually missing on `personal_profiles`):
- `is_approved boolean not null default false`
- `sales_rep_id uuid`, `created_by_rep_id uuid`
- `background_theme_style text`, `primary_color text`, `secondary_color text` (if not already present)
Add matching GRANTs + policies so reps can insert/update their own rep-owned rows and admins can approve.

### 2. Demo builder UI mirrors the Solo dashboard editor

Rebuild the left column of `RepDemoCreate` to reuse the same components the Solo owner sees, driven by the in-progress `personal_profiles` row:
- **Content tab**: `DashboardHeroEditor` (name, headline, photo, banner) + `DashboardUnifiedContent` (draggable interleaved links + blocks, add/edit/reorder/delete, image tiles, half-width grid) — exactly the Solo experience.
- **Design tab**: `DashboardDesignTab` (header type/color/image, background color, theme).
- **Leads tab**: keep the rep-only mock-lead preview.
- Right column: keep `LivePhonePreview`, but bind it to the same profile/links/blocks state so what the rep drags is what the preview shows.

This means the rep creates the profile row first (draft, `is_approved=false`), then edits it with the real Solo editor components until they submit for approval. Two-step "save then upload PDF" flow stays.

### 3. Downstream rep pages point at `personal_profiles`

- `RepBusinesses.tsx`: pipeline table reads from `personal_profiles where sales_rep_id = <rep>`; status column, PDF upload, and "View as Rep" still work against profile ids.
- `RepHome.tsx`: today/pending demo counts query `personal_profiles` on `created_by_rep_id` + `is_approved`.
- Admin approval action in `AdminReps` / `AdminDemoRequests` flips `personal_profiles.is_approved`.
- Public hub already resolves Solo profiles via the unified `/:slug` resolver, so the shareable demo URL keeps working without extra changes.

### 4. Legacy `restaurants`-based demos

Existing rep-created rows in `restaurants` stay untouched for history. They stop counting toward quotas because the new queries read `personal_profiles`. No destructive migration.

### 5. Commission attribution

`sales_rep_id` on `personal_profiles` is what commission calculations read for new demos. Existing `commissions` rows keyed to `restaurants` are unaffected.

## Out of scope

- Redesigning the Solo dashboard itself.
- Changing the Venue Pack (Plus/`restaurants`) product — reps simply never create those anymore.
- Migrating pre-existing rep `restaurants` rows into `personal_profiles`.

## Technical notes

- Reuse: `DashboardHeroEditor`, `DashboardUnifiedContent`, `DashboardDesignTab`, `useTouchHoldDrag`, `personal_links`/`personal_blocks` schema, `LivePhonePreview`.
- New/updated files:
  - `src/pages/rep/RepDemoCreate.tsx` — rewritten around Solo profile draft.
  - `src/pages/rep/RepBusinesses.tsx`, `src/pages/rep/RepHome.tsx` — swap queries.
  - `src/pages/admin/AdminReps.tsx` / `AdminDemoRequests.tsx` — approval targets `personal_profiles`.
  - One migration for the `personal_profiles` deltas + RLS updates.
- RLS: sales reps can `select/insert/update` `personal_profiles` and its `personal_links`/`personal_blocks` when `sales_rep_id = auth.uid()`; admins retain full access via `is_admin()`; owners keep their existing policies.
