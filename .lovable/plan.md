

# Affiliate Referral System — Phase 2: Payout Tracking + Abuse Prevention

## Overview

Two major additions to the affiliate system:
1. **Payout Tracking** -- Track affiliate earnings (commission per paid referral), admin management for marking payouts as sent
2. **Abuse Prevention** -- Flag suspicious signups using IP address tracking, duplicate email domain detection, and rapid-fire signup detection

---

## Part 1: Payout Tracking

### Database Changes

**New table: `affiliate_commissions`**

| Column | Type | Details |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| affiliate_id | uuid NOT NULL | references affiliates.id |
| referral_id | uuid NOT NULL | references affiliate_referrals.id, UNIQUE |
| amount | numeric NOT NULL | commission amount (e.g. 5.00) |
| status | text NOT NULL | 'pending' / 'paid' |
| paid_at | timestamptz NULL | when admin marked as paid |
| note | text NULL | optional admin note |
| created_at | timestamptz | DEFAULT now() |

**New table: `affiliate_settings`** (single-row config)

| Column | Type | Details |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| commission_per_referral | numeric NOT NULL | default 5.00 |
| payout_minimum | numeric NOT NULL | default 20.00 |
| program_enabled | boolean | DEFAULT true (global toggle) |
| updated_at | timestamptz | DEFAULT now() |

RLS: Admin full access on both tables. Affiliates can SELECT their own commission rows.

**Seed initial settings row:**

Insert a single row with default values ($5 commission, $20 minimum payout, program enabled).

### Auto-create commission on referral

Update `PersonalSignupComplete.tsx` -- after logging the referral in `affiliate_referrals`, also insert a row into `affiliate_commissions` with status 'pending' and the amount from `affiliate_settings`.

This requires fetching the current `commission_per_referral` from `affiliate_settings` first.

### Affiliate Dashboard updates

**File:** `src/pages/affiliate/AffiliateDashboard.tsx`

Add to existing dashboard:
- **Earnings summary card**: Total earned (paid commissions), Pending payout, Commission rate
- **Payout history list**: Date, amount, status (pending/paid) for each commission
- Update stats cards to also show dollar amounts

### Admin Affiliates page updates

**File:** `src/pages/admin/AdminAffiliates.tsx`

Add:
- **Pending payouts section**: List affiliates with pending commission totals above payout minimum
- **"Mark as Paid" button** on each affiliate's pending commissions (bulk action)
- **Settings panel**: Edit commission_per_referral, payout_minimum, toggle program_enabled

### New admin route: `/admin/affiliate-settings`

Could be a section within the existing `/admin/affiliates` page (a "Settings" tab) rather than a separate page, to keep things simple.

---

## Part 2: Abuse Prevention

### Database Changes

**New column on `affiliate_referrals`:**

The `ip_address` column already exists (added in Phase 1). We will now populate it.

**New table: `affiliate_abuse_flags`**

| Column | Type | Details |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| referral_id | uuid NOT NULL | references affiliate_referrals.id |
| flag_type | text NOT NULL | 'duplicate_ip', 'rapid_signup', 'suspicious_domain' |
| details | text NULL | human-readable explanation |
| resolved | boolean | DEFAULT false |
| resolved_by | uuid NULL | admin who resolved |
| created_at | timestamptz | DEFAULT now() |

RLS: Admin full access only. No public/affiliate access.

### Capture IP on signup

**File:** `supabase/functions/verify-personal-checkout/index.ts`

When creating the user record, capture the request IP from the edge function headers (`x-forwarded-for` or `x-real-ip`) and return it as part of the response.

**File:** `src/pages/personal/PersonalSignupComplete.tsx`

After logging the referral, update the `affiliate_referrals` row with the IP address returned from the verification response.

Alternatively (simpler approach): Create a small edge function or modify `verify-personal-checkout` to write the IP directly into `affiliate_referrals` server-side, avoiding client-side IP exposure.

### Auto-flag logic (server-side)

**New edge function: `supabase/functions/check-affiliate-abuse/index.ts`**

Called after a referral is logged. Checks:

1. **Duplicate IP** -- Query `affiliate_referrals` for other signups from the same affiliate with the same IP in the last 30 days. If found, insert a flag.
2. **Rapid signup** -- Query `affiliate_referrals` for signups from the same affiliate in the last hour. If 3+ signups in 1 hour, flag.
3. **Suspicious email domain** -- Check if the referred user's email uses a known disposable email domain (maintain a short list of ~20 common disposable domains like mailinator, guerrillamail, tempmail, etc.)

Returns the flags created (if any) so the caller can log them.

### Admin abuse dashboard

**File:** `src/pages/admin/AdminAffiliates.tsx`

Add an "Abuse Flags" tab/section:
- Table of unresolved flags with: affiliate name, referral username, flag type, details, date
- "Resolve" button to mark a flag as resolved (false positive)
- "Deactivate Affiliate" quick action if abuse is confirmed
- Filter: unresolved only / all
- Count badge showing unresolved flags

---

## Modified Files Summary

| File | Change |
|------|--------|
| `src/pages/affiliate/AffiliateDashboard.tsx` | Add earnings summary, payout history |
| `src/pages/admin/AdminAffiliates.tsx` | Add payouts section, settings panel, abuse flags tab |
| `src/pages/personal/PersonalSignupComplete.tsx` | Auto-create commission row, capture IP for abuse tracking |
| `supabase/functions/verify-personal-checkout/index.ts` | Return IP address in response |

## New Files Summary

| File | Purpose |
|------|---------|
| `supabase/functions/check-affiliate-abuse/index.ts` | Server-side abuse detection logic |

## Implementation Order

1. Database migration (affiliate_commissions, affiliate_settings, affiliate_abuse_flags tables + RLS + seed settings)
2. Commission auto-creation in PersonalSignupComplete
3. Affiliate dashboard earnings/payout UI
4. Admin payout management + settings panel
5. IP capture in verify-personal-checkout
6. Abuse detection edge function
7. Admin abuse flags UI

