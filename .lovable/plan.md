

# Affiliate Referral System — Updated: 14-Day Free Trial

## Key Change from Previous Plan

Instead of granting **lifetime VIP**, referred users now get a **14-day free trial** of Pro features. After 14 days, they auto-downgrade to the free plan unless they upgrade to a paid subscription.

---

## Database Changes

### 1. Add 'affiliate' to the `app_role` enum

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';
```

### 2. New table: `affiliates`

| Column | Type | Details |
|--------|------|---------|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid NOT NULL UNIQUE | references auth.users |
| referral_code | text NOT NULL UNIQUE | typically their username |
| max_invites | int NULL | NULL = unlimited |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 3. New table: `affiliate_referrals`

| Column | Type | Details |
|--------|------|---------|
| id | uuid PK | `gen_random_uuid()` |
| affiliate_id | uuid NOT NULL | references affiliates.id |
| referred_user_id | uuid NOT NULL UNIQUE | references auth.users |
| referred_profile_id | uuid NULL | references personal_profiles.id |
| created_at | timestamptz | DEFAULT now() |
| ip_address | text NULL | for future abuse detection |

### 4. Add columns to `personal_profiles`

```sql
ALTER TABLE personal_profiles 
  ADD COLUMN referred_by text NULL,
  ADD COLUMN trial_ends_at timestamptz NULL;
```

- `referred_by` — the affiliate's referral code
- `trial_ends_at` — when the 14-day trial expires (NULL for non-trial users)

### 5. RLS Policies

- `affiliates`: Admin full access; affiliate can SELECT own row
- `affiliate_referrals`: Admin full access; affiliate can SELECT own referrals

### 6. DB function: `is_affiliate()`

Returns true if the current auth user is an active affiliate.

---

## Referred User Signup Flow

### How it works

1. User clicks `tapaway.co/signup?ref=USERNAME`
2. `PersonalSignup.tsx` captures `?ref=` and stores in `sessionStorage` as `tapaway_ref`
3. In `CheckoutStep.tsx`, when a referral code is detected:
   - **Skip Stripe payment entirely** (no card required)
   - Create the account with:
     - `plan_type: 'free'` (they are on the free plan)
     - `subscription_status: 'trialing'`
     - `trial_ends_at: NOW() + 14 days`
     - `referred_by: referralCode`
   - Log the referral in `affiliate_referrals`
4. Self-referral check: if `referral_code === username`, ignore silently

### Trial access logic

Update access checks throughout the app to respect `trial_ends_at`:

- If `subscription_status = 'trialing'` AND `trial_ends_at > now()` -- grant Pro features
- If `subscription_status = 'trialing'` AND `trial_ends_at <= now()` -- downgrade to free
  - On next dashboard load, auto-update: `subscription_status = 'expired'`, clear `trial_ends_at`
  - Show upgrade prompt: "Your free trial has ended. Upgrade to keep Pro features."

This check happens client-side in `PersonalDashboard.tsx` on profile load.

### What they see

- During trial: Badge showing "Pro Trial -- X days left" and "Invited by @username"
- After trial expires: Downgraded to free plan, upgrade CTA displayed

---

## Affiliate Dashboard

### Route: `/affiliate`

**File:** `src/pages/affiliate/AffiliateDashboard.tsx`

- Copyable referral link: `tapaway.co/signup?ref=CODE`
- Stats: total signups, active trials, expired trials
- Recent referrals list (name, username, signup date, trial status)
- Only accessible to users with active affiliate record

---

## Admin Controls

### Additions to `AdminPersonalAccounts.tsx`

- "Make Affiliate" button on any personal account row
  - Creates `affiliates` record with `referral_code = username`
  - Adds `affiliate` role to `user_roles`
- "Revoke Affiliate" button for existing affiliates
- Set invite cap (optional, NULL = unlimited)

### New page: `/admin/affiliates`

**File:** `src/pages/admin/AdminAffiliates.tsx`

- Table of all affiliates with: username, total referrals, active trials, status
- Actions: activate/deactivate, set cap, view referral list

---

## Dashboard Badge for Referred Users

**File:** `src/pages/personal/PersonalDashboard.tsx`

- If `profile.referred_by` exists and trial is active:
  - Show "Pro Trial via @username -- X days left"
- If trial expired:
  - Show upgrade prompt instead

---

## New Files

| File | Purpose |
|------|---------|
| `src/pages/affiliate/AffiliateDashboard.tsx` | Affiliate stats dashboard |
| `src/pages/admin/AdminAffiliates.tsx` | Admin affiliate management |
| `src/hooks/useAffiliateAccess.tsx` | Hook to check affiliate status |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/affiliate` and `/admin/affiliates` routes |
| `src/pages/personal/PersonalSignup.tsx` | Capture `?ref=` param into sessionStorage |
| `src/components/personal/signup/CheckoutStep.tsx` | Detect referral, skip payment, create trial account |
| `src/pages/admin/AdminPersonalAccounts.tsx` | Add Make/Revoke Affiliate buttons |
| `src/pages/personal/PersonalDashboard.tsx` | Trial expiry check + badge display |
| `src/lib/subscriptionStatus.ts` | Add `trialing` handling with expiry awareness |

## Implementation Order

1. Database migration (tables, columns, enum, RLS, function)
2. Signup flow (capture ref, apply 14-day trial, log referral)
3. Trial expiry logic in dashboard
4. Affiliate dashboard page
5. Admin affiliate management
6. Route wiring in App.tsx

