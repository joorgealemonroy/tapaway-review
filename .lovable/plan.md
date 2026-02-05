
## What’s happening (root cause)

There are two separate issues mixed together:

1) **Jorge is being sent to the business dashboard after login**
- `src/pages/Auth.tsx` logs in with `supabase.auth.signInWithPassword()` and then (for normal users) **defaults to `"/dashboard"`**.
- Jorge only has a **personal profile** (no restaurant record), so when `Dashboard.tsx` loads it detects “no restaurant” and redirects to `"/paywall"`.

2) **Jorge’s personal plan_type is literally `"test_mode"`**
- In the database, `public.personal_profiles.plan_type` for `username = 'jorge'` is currently `test_mode`.
- That’s why the Admin Personal Accounts page shows `test_mode`. (This value also risks confusing any future plan gating/UI.)

So even if “paywall is off”, Jorge can still *land on* the paywall because the **login redirect path is wrong**, and the **paywall guard currently doesn’t redirect away** due to a logic shortcut.

---

## Evidence from current backend data (Test environment)

From the current database:
- `personal_profiles.username = 'jorge'` has:
  - `user_id = be064e3d-3669-4338-a2df-198b97436743` (correct)
  - `subscription_status = 'active'`
  - `plan_type = 'test_mode'` (this is the “still reads test_mode” issue)

Also:
- There is **no restaurant** row for Jorge’s `owner_id`, so `/dashboard` will always route him to `/paywall`.

---

## Fix scope (what I will change)

### A) Data fix (remove “test_mode” and make Jorge VIP)
Update Jorge’s personal profile:
- `plan_type: 'vip'`
- keep `subscription_status: 'active'`

This fixes the Admin UI showing `test_mode` and ensures his personal account is treated as VIP.

**SQL (Test environment)**
```sql
UPDATE public.personal_profiles
SET plan_type = 'vip',
    subscription_status = 'active',
    updated_at = now()
WHERE username = 'jorge';
```

**Important note about Live vs Test**
Lovable Cloud has **separate Test and Live data**. If Jorge is logging in on the **published site**, we must run the same update in **Live** as well (I’ll include the exact SQL for you to run in Live if needed).

---

### B) Code fix 1 — make `/auth` redirect personal users correctly
**File:** `src/pages/Auth.tsx`

Right now, `determineRedirectDestination()` does:
- admin -> `/admin`
- sales rep -> `/rep`
- else -> `/dashboard` (this is the bug for personal-only accounts)

I will update `determineRedirectDestination()` to also check:
- whether the user has a **personal profile**
- whether the user has a **valid business restaurant**

Routing after login will become:
- If user has both valid business + personal -> `/select-dashboard`
- Else if valid business -> `/dashboard`
- Else if personal profile exists -> `/personal/dashboard`
- Else -> `/paywall`

This matches the intent of your `useAuth.signIn` logic, but applies to the actual login page you’re using.

---

### C) Code fix 2 — make the Paywall page redirect away for personal users
**Files:** `src/pages/PaywallGuard.tsx` and `src/pages/Paywall.tsx`

`usePaywallGuard()` currently exits immediately if the route is “public”:
```ts
if (isPublicRoute(location.pathname)) return;
```
But `/paywall` is listed as public, so the guard **never runs** on the paywall page, meaning users can get stuck seeing it.

I will change `usePaywallGuard()` so that:
- It still avoids redirect loops on other public pages,
- But **does not early-return on `/paywall`**, allowing it to redirect logged-in users who have a personal profile to `/personal/dashboard`.

Simplest safe rule:
- Only skip when `isPublicRoute(pathname)` AND `pathname !== "/paywall"`.

---

### D) (Optional but recommended) Make `/dashboard` more forgiving
**File:** `src/pages/Dashboard.tsx`

When a user has **no restaurant**, it currently does:
- redirect to `/paywall`

I’ll add a check:
- if they have a personal profile, redirect them to `/personal/dashboard` instead.

This prevents accidental paywall exposure if a personal user lands on `/dashboard` via bookmarks, old links, or direct navigation.

---

## Step-by-step implementation order

1) **Backend data update (Test)**
   - Update `personal_profiles.plan_type` for `jorge` from `test_mode` to `vip`
   - Verify via select that it now reads `vip`

2) **Auth redirect fix**
   - Update `src/pages/Auth.tsx` redirect decision logic to detect personal profiles and route accordingly

3) **Paywall guard fix**
   - Update `src/pages/PaywallGuard.tsx` so it actually runs on `/paywall` and can redirect personal users away

4) **Dashboard safety redirect (recommended)**
   - Update `src/pages/Dashboard.tsx` to route personal-only users to `/personal/dashboard` instead of `/paywall`

---

## Verification checklist (end-to-end)

1) In **Admin → Personal Accounts**, confirm `@jorge` now shows:
   - plan_type: `vip`

2) Login as `jorgealemonroy@gmail.com` via `/auth`:
   - Should land on `/personal/dashboard`
   - Should not see `/paywall`

3) While logged in as Jorge, manually visit:
   - `/dashboard` -> should redirect to `/personal/dashboard` (with the optional improvement)
   - `/paywall` -> should redirect to `/personal/dashboard` (after PaywallGuard fix)

4) If Jorge is testing on the **published site**, repeat after applying the same data update in **Live**.

---

## Notes / edge cases

- This approach does not weaken business paywall logic; it simply prevents personal-only users from being misrouted into the business paywall.
- The `"test_mode"` value appears to be a legacy artifact from when personal payments were disabled. Converting to `vip` is the cleanest admin-friendly representation.

