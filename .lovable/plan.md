## Admin Portal UI Overhaul + Promo Link System — APPROVED

### Status: IMPLEMENTING

### 1. Database: Create `promo_tokens` table
- Columns: id (uuid PK), token (uuid, unique), discount_type (text: 'free'|'50_off'), expires_at (timestamptz), is_used (boolean default false), used_by_user_id (uuid nullable), created_by_user_id (uuid), created_at (timestamptz default now())
- RLS: admin-only full access via `public.is_admin()`

### 2. Edge Function: `generate-promo-token`
- Validates caller is admin (JWT + email/role check via service role)
- Accepts `discount_type` ('free' | '50_off')
- Creates token with `expires_at = now() + 30 minutes`
- Returns full onboarding URL with `?promo_token=<token>`

### 3. Edge Function: `validate-promo-token`
- Accepts `token` UUID and optional `markUsed` + `usedByUserId` params
- Checks existence, expiry, used status
- Returns `{ valid, discount_type }` or marks as used when requested

### 4. Admin.tsx UI Redesign
- Replace pill buttons with responsive card grid (3-4 cols desktop, 2 cols mobile) with Lucide icons
- Remove paywall toggle section entirely
- Add "Promo Link Generator" card with discount type dropdown + generate button + copy URL
- Wrap both tables in `overflow-x-auto` with `min-w-[800px]`

### 5. Update `create-checkout-session`
- Accept optional `promoToken` param
- If provided with `50_off`: find/create a 50% off Stripe coupon, apply via `discounts` param
- Pass `promo_token` into Stripe session metadata (do NOT mark as used here — deferred to webhook)

### 6. Update `stripe-webhook`
- In `checkout.session.completed` handler: check metadata for `promo_token`
- If present, mark it as `is_used = true` + set `used_by_user_id`

### 7. Update `Onboarding.tsx`
- On mount: detect `?promo_token=<uuid>`, validate via edge function
- Store discount type in state, show badge indicating promo
- If `free`: after OAuth + restaurant creation, skip Stripe, create active subscription directly, mark token used
- If `50_off`: pass promoToken to `create-checkout-session`, token burned by webhook on completion
