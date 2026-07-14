
# Sales Partner Demo Factory — 5-Day Expiring Hubs

Turn the Sales Partner area into a fast tool for reps to hand-build demo review hubs that expire in 5 days unless the owner pays.

## 1. Database migration (safe, additive)

Add columns to `restaurants`:
- `created_by uuid references auth.users(id)` — nullable, stamped only on rep-created demos.
- `expires_at timestamptz` — nullable. **NULL for all existing rows**, so paying customers never expire.
- `owner_phone text` — nullable. Used for the SMS reminder.
- `website_url text` — nullable. Replaces Google Places lookup for reps.

RLS additions on `restaurants`:
- New policy: reps can `SELECT / UPDATE / DELETE` rows where `created_by = auth.uid()`.
- New policy: authenticated `INSERT` allowed when `created_by = auth.uid()` and `expires_at IS NOT NULL`.
- Admin bypass policies via `is_admin()` remain — admins keep full access.
- No changes to existing policies for real owners or `is_demo_account` seed data.

## 2. Rep hub creation flow (new page `RepDemoCreate.tsx`)

Replace the current "Close a Restaurant" (`RepClose.tsx`) flow with a single-screen manual form. Route: `/rep/demo/new` (and edit at `/rep/demo/:id`).

Fields:
- Business Name (required)
- Owner Phone (required — powers the SMS reminder)
- Website URL
- Google Review URL
- Instagram URL (optional)
- Yelp URL (optional)
- Logo upload → existing `restaurant-logos` bucket
- Up to 3 gallery images → same `restaurant-logos` bucket under `gallery/{restaurant_slug}/` (no new bucket)

Submit behavior — insert into `restaurants` with:
- `owner_id = auth.uid()` (lets the rep view/edit it initially)
- `created_by = auth.uid()`
- `expires_at = now() + interval '5 days'`
- `subscription_status = 'trialing'`
- `custom_slug` auto-generated from business name (kebab-case + short random suffix, uniqueness checked)

Then redirect to the rep dashboard list with a toast + "View Live" link. Edit mode reuses the same form and updates the row (RLS: `created_by = auth.uid()`).

## 3. Rep dashboard list (`RepRestaurants.tsx` rewrite)

Minimalist table, filtered by `.eq('created_by', user.id)`:

| Business Name | Created | Status | Actions |
|---|---|---|---|
| name | "Jul 14" | "4 days left" (amber ≤2d, red = "Expired") | Edit · View Live · Remind Owner |

- Status computed from `expires_at` vs `now()`.
- **Remind Owner** button visible only when `expires_at` is within 48h or already expired. Opens `sms:{owner_phone}?body={encoded_text}` with:
  > "Hey! Your TapAway custom review hub trial ends in 48 hours. Don't lose your custom page and review cards — tap here to secure your profile and keep collecting reviews: {checkout_url}"
- `checkout_url` = existing claim/paywall path for this hub (`/onboarding?claim={id}` or `/paywall?restaurant={id}`).
- View Live opens `/{custom_slug}` in a new tab.
- Top of page: "+ New Demo Hub" button linking to `/rep/demo/new`.

## 4. Public expiration wall & ownership hand-off

In `ReviewHub.tsx` (mirror in `PersonalProfilePage` if a rep-created row ever resolves there):

- After fetch, if `expires_at !== null && new Date(expires_at) < new Date()` and viewer is not admin (`useAdminAccess`), render `<ExpiredHubGate businessName={...} restaurantId={...} />`.

`src/components/hub/ExpiredHubGate.tsx` — premium minimalist dark screen, TapAway wordmark top-left, centered:
- H1: "Review Page Paused"
- Body: "This TapAway custom digital profile is currently inactive. If you are the owner of {businessName} and want to reactivate your review card, tap the button below."
- Primary button: "Unlock My Hub" → standard payment/checkout path.

**Ownership hand-off on payment.** On successful Stripe checkout webhook (or claim completion at `/onboarding?claim={id}`):
- Set `expires_at = NULL`.
- Update `owner_id` to the paying customer's authenticated user id.
- This permanently transfers the hub from the rep to the paying customer's dashboard.

## 5. Out of scope

- No changes to non-expiring paying customers' hubs.
- No changes to admin overrides — admins still see everything and bypass the wall.
- Global auth and rep commission calculations remain untouched.

## Files touched

- Migration (new)
- `src/pages/rep/RepDemoCreate.tsx` (new)
- `src/pages/rep/RepRestaurants.tsx` (rewrite)
- `src/pages/ReviewHub.tsx` (expiration check)
- `src/components/hub/ExpiredHubGate.tsx` (new)
- `src/App.tsx` (routes for `/rep/demo/new`, `/rep/demo/:id`)
- Stripe webhook + claim edge function (clear `expires_at`, reassign `owner_id`)
