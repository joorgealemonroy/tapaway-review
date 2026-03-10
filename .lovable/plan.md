

# Founding Creator Program — Implementation Plan

## Overview
Add a "first 1,000 users get Pro for life" program to the Personal TapAway product. This involves database columns, an atomic assignment trigger, UI components (banner, counter, badge), plan-limit integration, and an admin management page.

## 1. Database Migration

Add columns to `personal_profiles`:
- `is_founding_user BOOLEAN DEFAULT false`
- `founding_number INTEGER NULL`

Add a new `founding_pro` plan type to `personalPlanLimits.ts` (no DB enum needed — `plan_type` is already a `text` column).

Create a database function `assign_founding_status()` that runs as a trigger on INSERT to `personal_profiles`. It atomically:
1. Counts existing `is_founding_user = true` rows using `SELECT COUNT(*) ... FOR UPDATE` (advisory lock pattern)
2. If count < 1000, sets `NEW.is_founding_user = true`, `NEW.founding_number = count + 1`, `NEW.plan_type = 'founding_pro'`, `NEW.subscription_status = 'active'`
3. Returns NEW

Create the trigger: `BEFORE INSERT ON personal_profiles`.

Update the `personal_profiles_public` view to include `is_founding_user` and `founding_number`.

Create an RPC `get_founding_count()` (security invoker, stable) that returns the count of founding users — used by the landing page counter. No auth required.

## 2. Plan Limits Integration (`personalPlanLimits.ts`)

Add a `founding_pro` entry to `PERSONAL_PLANS` with identical features to `paid` (Pro) — unlimited links, all features enabled. Price displays as "$0" with "forever" subtext.

Update `getPlanLimits()`: if `planType === 'founding_pro'`, return `PERSONAL_PLANS.founding_pro`.
Update `isVIPPlan()` or add `isFoundingPlan()` to bypass billing checks.
Update `isPaidPlan()` to exclude `founding_pro` (it's free, not paid).

## 3. Billing/Paywall Bypass

In `PersonalBillingTab.tsx`: detect `founding_pro` plan and show "Founding Creator — Pro for life" instead of billing/upgrade UI.

In `CheckoutStep.tsx`: when `plan_type` is already `founding_pro` after profile creation (set by trigger), skip Stripe redirect entirely. The trigger handles this automatically during INSERT — no special checkout logic needed since the profile is created with `subscription_status = 'active'`.

## 4. UI Components

### FoundingBanner (new component)
- Displayed on Personal landing page (`/`) and signup page
- Text: "🚀 Founding Creator Access: The first 1,000 users get TapAway Pro free for life."
- Fetches founding count via `get_founding_count()` RPC
- Auto-hides when count >= 1000

### FoundingCounter (new component)
- Displayed on Personal landing page below hero
- Shows "X / 1,000 spots claimed" with a progress bar
- Same RPC data source

### Founding Creator Badge
- On `PersonalProfilePage.tsx`: if `is_founding_user` is true on the profile, show a small "Founding Creator" badge below the username
- Gold/amber colored badge with a star icon

## 5. Admin Page (`/admin/founders`)

New lazy-loaded route and page:
- Protected by `useAdminAccess` hook
- Stat card: total founding users count
- Table: founding_number, username, full_name, email, created_at
- "Revoke" button per row: sets `is_founding_user = false`, `plan_type = 'free'`, `founding_number = null`
- Add navigation link in Admin page

## 6. Files to Create/Modify

| File | Action |
|------|--------|
| DB migration | Add columns, trigger function, RPC, update view |
| `src/lib/personalPlanLimits.ts` | Add `founding_pro` plan, update helpers |
| `src/components/personal/PersonalBillingTab.tsx` | Handle `founding_pro` display |
| `src/components/landing/personal/FoundingBanner.tsx` | New component |
| `src/components/landing/personal/FoundingCounter.tsx` | New component |
| `src/pages/Personal.tsx` | Add FoundingBanner + FoundingCounter |
| `src/pages/personal/PersonalSignup.tsx` | Add FoundingBanner |
| `src/pages/personal/PersonalProfilePage.tsx` | Add Founding Creator badge |
| `src/pages/admin/AdminFounders.tsx` | New admin page |
| `src/App.tsx` | Add `/admin/founders` route |
| `src/pages/Admin.tsx` | Add nav link to founders page |

## 7. Constraints Honored
- Existing signup flow unchanged — trigger fires automatically on profile INSERT
- `founding_pro` with `subscription_status = 'active'` bypasses all paywalls via existing `isSubscriptionAllowed()` checks
- No social auth breakage — trigger works regardless of auth method

