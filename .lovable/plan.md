

# VIP Card Codes: Generate Cards That Bypass All Paywalls

## Problem
Currently, all generated NFC card codes are identical — they just link to a profile. There's no way to generate special codes that automatically grant VIP access (full Pro features, no Stripe, no paywall).

## Solution
Add a `card_type` field to NFC cards so you can generate "VIP" codes from the Admin Cards page. When someone activates a VIP code, their account is automatically set to VIP plan — skipping all checkout/payment steps.

## Changes

### 1. Database Migration
Add a `card_type` column to `nfc_cards`:
```sql
ALTER TABLE nfc_cards ADD COLUMN card_type text NOT NULL DEFAULT 'standard';
```
Values: `'standard'` (default) or `'vip'`.

### 2. Admin Cards Page (`src/pages/admin/AdminCards.tsx`)
- Add a toggle/select next to the "Generate" button to choose card type: **Standard** or **VIP**
- Pass `card_type` when inserting new cards
- Show a "VIP" badge in the cards table for VIP codes
- VIP codes are visually distinct so you can tell them apart at a glance

### 3. Claim Card Edge Function (`supabase/functions/claim-card/index.ts`)
- After claiming the card, check if `card.card_type === 'vip'`
- If VIP, update the user's `personal_profiles` row: set `plan_type = 'vip'` and `subscription_status = 'active'`
- This ensures the user gets full Pro features with no Stripe subscription required

### 4. Signup Flow Detection (`src/pages/personal/PersonalSignup.tsx`)
- When a user comes from a card activation URL (`?card=CODE`), look up the card's `card_type`
- If the card is VIP, auto-select free plan, skip the checkout step entirely, and mark the account as VIP after profile creation
- The `CheckoutStep` is bypassed completely for VIP card users

### 5. Card Resolver (`src/pages/CardResolver.tsx`)
- When an unclaimed VIP card is tapped, pass the VIP flag through to the signup flow via sessionStorage (`tapaway_card_vip = true`)
- This way the signup flow knows to skip payment without an extra DB lookup on every step

## Flow Summary

```text
Admin generates VIP codes
        ↓
User taps VIP NFC card → /c/ABCDEF
        ↓
CardResolver detects unclaimed + VIP → sets sessionStorage flag
        ↓
User goes through signup (Identity → Links → Preview)
        ↓
Checkout step is SKIPPED (VIP flag detected)
        ↓
Account created with plan_type='vip', subscription_status='active'
        ↓
claim-card function also sets VIP on profile (belt-and-suspenders)
        ↓
User lands in dashboard with full Pro access, no paywall ever
```

## Technical Details

- The existing VIP plan infrastructure (`isVIPPlan`, `PERSONAL_PLANS.vip`, billing tab "VIP Access" badge) is already fully built — this just adds a way to create VIP accounts via card codes
- Standard cards continue to work exactly as they do now (free plan, checkout step shown)
- The `card_type` column defaults to `'standard'` so all existing cards are unaffected

