

# Confetti Welcome + Fix Affiliate Tracking + Affiliate Dashboard Upgrade

## Issues Identified

1. **Affiliate tracking is broken**: The `AffiliatePaywall` saves the referral code to `sessionStorage`, but when users redirect to Stripe (external site) and return, `sessionStorage` is wiped. This is why Jorge shows 0 referrals despite referring Sonia and others.

2. **No confetti or celebration on first dashboard visit**: Users land on the dashboard with just a tutorial overlay -- no celebratory moment.

3. **Affiliate dashboard lacks earnings logic**: It doesn't distinguish between trial users (no commission yet) and converted/paying users ($5 commission). No "potential payout" shown.

---

## 1. Fix Affiliate Tracking (Critical Bug)

**File: `src/components/personal/signup/AffiliatePaywall.tsx`**

Change `sessionStorage.setItem("tapaway_ref", referralCode)` to `localStorage.setItem("tapaway_ref", referralCode)`. localStorage persists across the Stripe redirect.

Also save `personal_signup_data` and `signup_password` to `localStorage` instead of `sessionStorage` so they survive the redirect too.

**File: `src/pages/personal/PersonalSignupComplete.tsx`**

Update all `sessionStorage.getItem(...)` calls to check `localStorage` first, then fall back to `sessionStorage`:
- `personal_signup_data`: check localStorage first
- `signup_password`: check localStorage first  
- `tapaway_ref`: check localStorage first
- Clean up both storage locations after use

**Manual fix for Sonia**: Since Sonia's profile already exists with `referred_by: null`, we'll need to manually fix her record and create the referral row. This can be done via a one-time database update.

---

## 2. Confetti + Welcome Toast on First Dashboard Visit

**File: `src/pages/personal/PersonalDashboard.tsx`**

When `?welcome=true` is detected (which already triggers the tutorial):
- Show a confetti animation (using a lightweight CSS/canvas confetti effect)
- Display a toast or brief banner: "Thank you for joining TapAway!"
- The user is already logged in and on their dashboard -- they can start customizing immediately

**New file: `src/components/personal/ConfettiEffect.tsx`**

A simple confetti component using canvas that:
- Fires on mount
- Runs for about 3 seconds
- Auto-cleans up
- Renders as a fixed overlay that doesn't block interaction

---

## 3. Revamp Affiliate Dashboard

**File: `src/pages/affiliate/AffiliateDashboard.tsx`**

Restructure the dashboard with clearer earnings logic:

**Earnings Section** (replaces current grid):
- "Commission Rate": $5.00 per converted user
- "Active Trials": count of users currently trialing (no commission yet -- show as "potential")
- "Converted Users": count of users with `subscription_status = 'active'` (paid at least once)
- "Potential Payout": $5 x active trials (what you'd earn if they all convert)
- "Earned": total from actual paid commissions
- "Pending Payout": commissions marked pending (awaiting payout processing)

**Commission Rules Card** (new mini section):
- "You earn $5 for each referred user who completes at least one payment"
- "Trial signups appear as 'Active Trial' -- no commission until they convert"
- "Commissions are paid out [weekly/monthly]"

**Referrals List** (updated statuses):
- "Active Trial" (green badge) -- trialing, trial hasn't ended
- "Converted" (blue badge) -- subscription_status is 'active', paid
- "Expired" (gray badge) -- trial ended without conversion
- Show "$5.00 earned" next to converted users, "Pending conversion" next to trials

**Change commission creation logic**:

**File: `src/pages/personal/PersonalSignupComplete.tsx`**

Currently, a commission is auto-created when a referral is logged (during trial signup). This is wrong -- commissions should only be created when the user actually pays. Change the referral logging (Step 7b) to:
- Still create the `affiliate_referrals` row
- Still set `referred_by` on the profile
- Do NOT create a commission row yet (remove the commission insert)
- Commissions should be created by the Stripe webhook when the first real payment occurs

This means the `stripe-webhook` edge function (or a separate mechanism) needs to handle commission creation on first payment. For now, we can note this as a follow-up and keep the commission creation but mark it with a `status: 'pending_conversion'` instead of `'pending'`, then update to `'pending'` (eligible for payout) when the user's subscription moves from `trialing` to `active`.

---

## 4. Fix Sonia's Data (One-Time)

Run a database migration to:
- Update Sonia's `referred_by` to `'jorge'`
- Create the missing `affiliate_referrals` row linking jorge's affiliate ID to Sonia's profile
- No commission row yet (she's on trial, hasn't converted)

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/personal/signup/AffiliatePaywall.tsx` | Switch from sessionStorage to localStorage for all signup data |
| `src/pages/personal/PersonalSignupComplete.tsx` | Read from localStorage first; don't auto-create commission on trial signup |
| `src/pages/personal/PersonalDashboard.tsx` | Add confetti effect and welcome toast on `?welcome=true` |
| `src/components/personal/ConfettiEffect.tsx` | **NEW** -- Lightweight confetti animation component |
| `src/pages/affiliate/AffiliateDashboard.tsx` | Revamp with commission rules, trial vs converted distinction, potential payout |
| Database migration | Fix Sonia's `referred_by` and create missing referral row |

## Implementation Order

1. Fix storage: AffiliatePaywall and PersonalSignupComplete (localStorage)
2. Fix Sonia's data (database migration)
3. Add confetti effect component
4. Add confetti + welcome toast to PersonalDashboard
5. Revamp AffiliateDashboard with earnings logic and commission rules
6. Update commission creation logic (no commission on trial, only on conversion)
