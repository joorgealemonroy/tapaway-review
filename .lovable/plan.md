

# NFC Card Activation System for TapAway Personal

## Overview

Build a complete NFC card activation flow using the new URL pattern `tapaway.co/c/{public_code}`. This repurposes the existing `nfc_cards` table (already has the right columns) and adds the public route, admin bulk generator, activation flow with OTP auth, and dashboard card management.

## Database Changes

The `nfc_cards` table already exists with the needed columns (`id`, `public_code`, `status`, `owner_user_id`, `destination_type`, `destination_value`, `claimed_at`, `created_at`, `batch_id`). Minor adjustments needed:

1. Drop the `claim_code_hash` NOT NULL constraint (not needed for this flow)
2. Add index on `public_code` if not already present
3. Update RLS policies:
   - Public SELECT on `public_code`, `status`, `destination_type`, `destination_value` (for route resolution)
   - Owner can UPDATE their own cards (already exists)
   - Admin full access (already exists)
   - INSERT only via admin (already covered)
4. Add a validation trigger to prevent re-claiming (status = 'claimed' cannot be changed back to 'unclaimed')

## New Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/c/:publicCode` | `CardResolver.tsx` | Public card route -- resolve, activate, or redirect |
| `/admin/cards` | `AdminCards.tsx` | Admin bulk card generator |

Add both routes to `App.tsx` above the `/:slug` catch-all.

## Components and Pages

### 1. Card Resolver Page (`src/pages/CardResolver.tsx`)

The main public-facing route. Logic:

- Fetch card by `public_code`
- **Card not found**: Show clean "Invalid Card" error page
- **Card unclaimed**: Show activation screen (Apple-style, mobile-first, large CTA)
  - If user not logged in: show email input + OTP verification (reuses existing `send-custom-otp` / `verify-custom-otp` edge functions)
  - After auth: claim card (set `owner_user_id`, `status = claimed`, `destination_type = profile`, `destination_value = username`, `claimed_at = now()`)
  - Redirect to `/personal/dashboard?tab=cards`
- **Card claimed**: Server-style redirect
  - `destination_type = profile` --> redirect to `/{destination_value}`
  - `destination_type = external_url` --> redirect to external URL

### 2. Card Activation UI

Mobile-first, minimal Apple-style design:
- TapAway logo at top
- Card illustration or icon
- "Activate Your TapAway Card" heading
- Email input + "Send Code" button
- OTP input (6 digits, reuses existing `InputOTP` component)
- Large "Activate" CTA button
- Clean white background, no clutter

### 3. Admin Cards Page (`src/pages/admin/AdminCards.tsx`)

Protected by `useAdminAccess()`. Features:
- Quantity input (default 100)
- "Generate Cards" button
- On submit: generate X unique 6-character uppercase alphanumeric codes, insert into `nfc_cards`
- Show table of generated codes with columns: `public_code`, `full URL`, `status`
- Export CSV button (columns: `public_code`, `tapaway.co/c/{public_code}`)
- Below: table of all existing cards with search/filter

### 4. Dashboard Cards Tab

Add a "Cards" tab to `PersonalDashboard.tsx`:
- Show all cards owned by current user
- Each card shows: `public_code`, status, current destination
- "Change Destination" button: modal to switch between `profile` (auto-fills username) or `external_url` (URL input)
- "Disable Card" button: sets status to `disabled`
- Add "Cards" icon to `MobileBottomNav` "More" menu

## Edge Function: `claim-card`

New edge function `supabase/functions/claim-card/index.ts`:
- Accepts `{ public_code, user_id }`
- Uses service role to:
  1. Verify card exists and status = 'unclaimed'
  2. Look up user's `personal_profiles.username`
  3. Update card: `owner_user_id`, `status = claimed`, `destination_type = profile`, `destination_value = username`, `claimed_at = now()`
- Returns success or error
- This runs server-side to prevent race conditions on claiming

## Username Change Handling

Since users can now change their username after card activation, cards with `destination_type = profile` should resolve the username dynamically. Two options:

- **Option A (chosen)**: When a user changes their username, update all their cards' `destination_value` to the new username. Add this logic to the existing profile save flow in `PersonalDashboard.tsx`.
- This keeps the redirect fast (no extra DB lookup at resolve time).

## File Changes Summary

| File | Action |
|------|--------|
| `src/App.tsx` | Add `/c/:publicCode` and `/admin/cards` routes |
| `src/pages/CardResolver.tsx` | New -- public card route page |
| `src/pages/admin/AdminCards.tsx` | New -- admin bulk generator |
| `src/components/personal/DashboardCardsTab.tsx` | New -- dashboard cards management |
| `src/pages/personal/PersonalDashboard.tsx` | Add "Cards" tab |
| `src/components/personal/MobileBottomNav.tsx` | Add "Cards" to More menu |
| `supabase/functions/claim-card/index.ts` | New -- server-side card claiming |
| `supabase/config.toml` | Add `claim-card` function config |
| Database migration | Update `nfc_cards` table constraints and RLS |

## Security

- Card claiming happens server-side via edge function (prevents race conditions)
- RLS ensures only owners can modify their cards
- Admin-only bulk generation via `is_admin()` check
- OTP auth via existing Resend-based flow (no-reply@tapaway.co)
- Cards cannot be re-claimed once status = 'claimed'
- Public route only reads minimal card data (no user info exposed)

## Performance

- `public_code` column indexed for fast lookups
- Claimed cards redirect immediately (no UI render)
- Card resolver uses single DB query
- Lazy-loaded route components

