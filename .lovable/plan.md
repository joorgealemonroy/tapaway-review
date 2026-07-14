
# Sales Partner Demo Factory & Business Lite Default Routing

## Part 1 — Admin "View as Sales Partner"

Give the super admin a one-click way to open the Sales Partner portal exactly as the selected rep sees it — dashboard totals, commissions, demo hubs, profile, docs, resources — with a clear banner and a Back to Admin button.

### Entry point

In `src/pages/admin/AdminReps.tsx`, add a **"View as Rep"** button on each row of the reps table (Actions column). It navigates to:

```
/rep?admin_view_rep={rep_id}
```

### Impersonation logic

Extend `src/hooks/useSalesRep.tsx`:
- Read `admin_view_rep` from the URL.
- If present **and** the caller is a super admin (`useAdminAccess`), load *that* rep's row from `sales_reps` instead of the caller's own row, and return `isSalesRep: true`.
- Otherwise, unchanged behavior. Non-admins with `admin_view_rep` in the URL are ignored — no privilege escalation.
- The existing `if (!isSalesRep) navigate('/')` gate on each rep page passes automatically because the hook returns `true` for admins.

### DRY banner + link forwarding

Instead of editing all seven rep pages, add one global overlay component `src/components/rep/RepImpersonationOverlay.tsx` that:
- Renders only when `location.pathname` starts with `/rep` **and** `admin_view_rep` is present **and** the caller is admin.
- Shows a sticky amber banner: "Viewing as {rep.name}" with a **Back to Admin** button returning to `/admin/reps`.
- On any intra-portal navigation that drops the query param, silently re-appends `?admin_view_rep={id}` via `navigate(..., { replace: true })`. This keeps impersonation sticky across every `navigate('/rep/...')` call without touching each page.

Mount `<RepImpersonationOverlay />` once inside `App.tsx`, above `<Routes>`.

## Part 2 — Business Lite becomes the only dashboard for new users

All new users should land on Business Lite (`PersonalDashboard`). Users already on a legacy paid restaurant plan keep the existing business dashboard.

### Legacy plan list

In `src/lib/subscriptionStatus.ts`, export:

```ts
export const LEGACY_BUSINESS_PLANS = new Set([
  'venue', 'venue_pack', 'solo_pro', 'multi',
]);
export const ACTIVE_SUB_STATUSES = new Set([
  'active', 'trialing', 'past_due', 'paused',
]);
```

### Routing rule (`Dashboard.tsx`)

Replace the "has any completed non-solo restaurant → business" branch. New rule:

Route to Legacy Business dashboard **only** when all of these hold:
1. Restaurant row exists for the user.
2. `onboarding_completed = true`.
3. `plan_type` ∈ `LEGACY_BUSINESS_PLANS`.
4. `subscription_status` ∈ `ACTIVE_SUB_STATUSES`.

Anything else → Business Lite (`PersonalDashboard`).

Preserve existing overrides:
- `?admin_view=` and `?demo_restaurant_id=` still force the business view.
- `?admin_view_personal=` / `?type=lite` still force lite.

### Onboarding destination

In `src/pages/Onboarding.tsx`, change the two branches that redirect after completion / on already-completed restaurants (the ones currently choosing `/dashboard?type=lite` vs `/dashboard`) to always redirect to plain `/dashboard`. The new routing rule decides Lite vs Legacy.

## Out of scope

- No DB schema changes.
- No changes to `Onboarding.tsx` internals beyond the final redirect target.
- No changes to `admin_view` (restaurant) or `admin_view_personal` (profile) impersonation.
- No changes to rep RLS or the rep application/approval flow.

## Files touched

- `src/pages/admin/AdminReps.tsx` — add "View as Rep" button.
- `src/hooks/useSalesRep.tsx` — impersonation lookup for admins.
- `src/components/rep/RepImpersonationOverlay.tsx` — new global banner + param-sticky helper.
- `src/App.tsx` — mount the overlay.
- `src/lib/subscriptionStatus.ts` — export `LEGACY_BUSINESS_PLANS` and `ACTIVE_SUB_STATUSES`.
- `src/pages/Dashboard.tsx` — new legacy-plan routing gate.
- `src/pages/Onboarding.tsx` — clean redirect target.
