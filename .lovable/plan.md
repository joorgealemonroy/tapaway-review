

# Admin Portal UI Overhaul + Promo Link System — Implementation Plan

## Overview
Redesign the admin portal navigation, replace the paywall toggle with a promo link generator, ensure mobile compatibility, and integrate promo tokens into the onboarding checkout flow. The 50% off token is only burned on Stripe webhook `checkout.session.completed` (not during checkout creation) to prevent burned tokens from abandoned checkouts.

## Changes

### 1. Database Migration: `promo_tokens` table
Create table with columns: `id` (uuid PK), `token` (uuid unique), `discount_type` (text: 'free' or '50_off'), `expires_at` (timestamptz), `is_used` (boolean default false), `used_by_user_id` (uuid nullable), `created_by_user_id` (uuid), `created_at` (timestamptz). RLS admin-only via `public.is_admin()`. Validation trigger for discount_type.

### 2. New Edge Function: `generate-promo-token`
- Validates caller is admin via JWT (checks email + user_roles table)
- Accepts `discount_type` ('free' | '50_off')
- Creates token with 30-minute expiry
- Returns full onboarding URL with `?promo_token=<uuid>`

### 3. New Edge Function: `validate-promo-token`
- Accepts `token` UUID + optional `markUsed` / `usedByUserId`
- Validates: exists, not expired, not used
- Returns `{ valid, discount_type }` or marks used when requested

### 4. Admin.tsx UI Redesign
- **Card grid nav**: Replace pill buttons with responsive icon cards (3-4 cols desktop, 2 cols mobile) using Lucide icons
- **Remove paywall toggle**: Delete `getAppSettings`/`setPaywallEnabled` imports and all paywall state/UI
- **Promo Link Generator**: New card with discount type dropdown + "Generate 30-Min Link" button + copy URL with countdown
- **Mobile tables**: Wrap both tables in `overflow-x-auto` with `min-w-[800px]`

### 5. AdminBusinessLiteTable.tsx
- Add `overflow-x-auto` wrapper with `min-w-[800px]` on the table

### 6. Update `create-checkout-session`
- Accept optional `promoToken` param
- If `50_off`: find/create a 50% Stripe coupon, apply via `discounts` array
- Pass `promo_token` into Stripe session metadata (NOT marked as used)

### 7. Update `stripe-webhook`
- In `checkout.session.completed`: read `promo_token` from metadata
- If present, mark it as `is_used = true` + set `used_by_user_id` (deferred burn)

### 8. Update `Onboarding.tsx`
- On mount: detect `?promo_token=<uuid>`, call `validate-promo-token`
- Store `promoDiscountType` in state, show visual badge
- **Free flow**: After OAuth + restaurant creation, skip Stripe entirely. Set subscription_status to 'active', mark token used via edge function
- **50% off flow**: Pass `promoToken` to `create-checkout-session`. Token burned only by webhook on successful payment

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | **New** — create `promo_tokens` table + trigger + RLS |
| `supabase/functions/generate-promo-token/index.ts` | **New** |
| `supabase/functions/validate-promo-token/index.ts` | **New** |
| `src/pages/Admin.tsx` | **Modify** — card grid nav, remove paywall, add promo generator, overflow-x tables |
| `src/components/admin/AdminBusinessLiteTable.tsx` | **Modify** — overflow-x-auto wrapper |
| `supabase/functions/create-checkout-session/index.ts` | **Modify** — add promo coupon support |
| `supabase/functions/stripe-webhook/index.ts` | **Modify** — burn promo token on checkout complete |
| `src/pages/Onboarding.tsx` | **Modify** — promo token detection + free/50% flows |

