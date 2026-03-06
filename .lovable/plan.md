

# Creator Marketplace — Digital Products on Personal Hubs

This is a large feature spanning database, edge functions, storage, dashboard UI, public profile rendering, and webhook handling. Here is the full implementation plan.

---

## 1. Database Migration

### Add Stripe Connect columns to `personal_profiles`
- `stripe_connect_account_id TEXT` (the connected Stripe account ID, e.g. `acct_xxx`)
- `is_stripe_onboarded BOOLEAN DEFAULT false`

### Create `creator_products` table
```text
id              UUID PK DEFAULT gen_random_uuid()
creator_id      UUID NOT NULL (FK → personal_profiles.id)
title           TEXT NOT NULL
description     TEXT
price_cents     INTEGER NOT NULL (store in cents to avoid float issues)
product_type    TEXT NOT NULL DEFAULT 'pdf' (enum: 'pdf', 'course', 'video')
file_url        TEXT (path in Supabase Storage)
cover_image_url TEXT
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### Create `creator_purchases` table (tracks completed purchases)
```text
id                  UUID PK DEFAULT gen_random_uuid()
product_id          UUID NOT NULL (FK → creator_products.id)
buyer_email         TEXT NOT NULL
stripe_session_id   TEXT NOT NULL
access_token        TEXT NOT NULL (random UUID for secure download link)
access_expires_at   TIMESTAMPTZ NOT NULL (e.g. 72 hours from purchase)
created_at          TIMESTAMPTZ DEFAULT now()
```

### RLS Policies
- `creator_products`: Public SELECT where `is_active = true`; INSERT/UPDATE/DELETE for profile owner only
- `creator_purchases`: INSERT via service role (webhook); SELECT for buyer (by `buyer_email` matching current user email) and for creator (via product → profile ownership)

### Storage Bucket
- Create `creator-files` bucket (private, NOT public) for digital product files

---

## 2. Creator Onboarding — "Connect Stripe" Button

### Edge Function: `create-connect-account-link`
- Accepts `profileId` from authenticated user
- Creates a Stripe Standard Connect account via `stripe.accounts.create({ type: 'standard' })`
- If profile already has `stripe_connect_account_id`, reuse it; otherwise create new
- Generates an Account Link via `stripe.accountLinks.create()` with `return_url` and `refresh_url` pointing back to the dashboard
- Returns the Account Link URL

### Edge Function: `verify-connect-onboarding`
- Called when user returns to dashboard after Stripe onboarding
- Retrieves the Stripe account via `stripe.accounts.retrieve(accountId)`
- Checks `charges_enabled` and `details_submitted`
- If both true, updates `personal_profiles.is_stripe_onboarded = true`

### Dashboard UI Changes (`PersonalShopTab.tsx`)
- Replace the existing NFC card shop with a dual-purpose tab:
  - If NOT onboarded: show "Connect Stripe" button + explanation
  - If onboarded: show product management form + product list

---

## 3. Product Listing & Upload Form

### In `PersonalShopTab.tsx` (when onboarded):
- Form with: title, description, price ($), product type dropdown (PDF/Course/Video), file upload, optional cover image
- File uploads go to `creator-files` bucket under `{user_id}/{product_id}/filename`
- Cover images go to `personal-photos` bucket (already public)
- Products saved to `creator_products` table
- List of existing products with toggle active/inactive and delete

---

## 4. Public Profile "Product Block"

### In `PersonalProfilePage.tsx`:
- After loading the profile, also fetch `creator_products` where `creator_id = profile.id` and `is_active = true`
- Render a "Shop" section showing product cards with cover image, title, price, and "Buy Now" button
- Only shown if the creator has at least one active product AND `is_stripe_onboarded = true`

### "Buy Now" Button Flow:
- Calls edge function `create-product-checkout` with `productId`
- Edge function creates a Stripe Checkout Session using **direct charges**:
  ```
  stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: {...}, quantity: 1 }],
    payment_intent_data: {
      application_fee_amount: 0, // Easy to change later
      transfer_data: { destination: creator.stripe_connect_account_id }
    },
    success_url: ...,
    cancel_url: ...,
    metadata: { product_id, buyer_email }
  })
  ```
- Returns checkout URL; frontend redirects buyer

---

## 5. Post-Purchase Delivery via Webhook

### Update `stripe-webhook/index.ts`:
- Add handling for `checkout.session.completed` where metadata contains `product_id` (marketplace purchase)
- On match:
  1. Generate a random `access_token` (UUID)
  2. Insert into `creator_purchases` with 72-hour expiry
  3. Construct a secure download URL: `/api/download/{access_token}` (via edge function)
  4. Redirect the buyer's success page shows the download link

### Edge Function: `download-product`
- Accepts `access_token` query param
- Looks up `creator_purchases` by token
- Validates `access_expires_at > now()`
- Creates a signed URL from `creator-files` bucket
- Returns 302 redirect to the signed URL (or streams the file)

---

## 6. Files to Create/Modify

| File | Action |
|------|--------|
| DB migration | Add columns + tables + RLS + bucket |
| `supabase/functions/create-connect-account-link/index.ts` | New |
| `supabase/functions/verify-connect-onboarding/index.ts` | New |
| `supabase/functions/create-product-checkout/index.ts` | New |
| `supabase/functions/download-product/index.ts` | New |
| `supabase/functions/stripe-webhook/index.ts` | Add marketplace purchase handler |
| `supabase/config.toml` | Register new functions |
| `src/components/personal/PersonalShopTab.tsx` | Full rewrite: Connect Stripe + product CRUD |
| `src/pages/personal/PersonalDashboard.tsx` | Pass `stripe_connect_account_id` + `is_stripe_onboarded` to ShopTab |
| `src/pages/personal/PersonalProfilePage.tsx` | Fetch + render product cards with Buy Now |

---

## 7. Application Fee Structure

The `application_fee_amount` is set to `0` in `create-product-checkout` but extracted as a constant:
```typescript
const APPLICATION_FEE_PERCENT = 0; // Change to e.g. 0.10 for 10%
const feeAmount = Math.round(priceInCents * APPLICATION_FEE_PERCENT);
```
This makes it trivial to adjust later.

---

## 8. Security Notes

- Digital files stored in a **private** bucket — only accessible via signed URLs from the download edge function
- Access tokens expire after 72 hours
- Stripe Connect uses Standard accounts: the creator handles refunds/disputes directly in their own Stripe dashboard
- All edge functions validate JWT except `download-product` (uses access token) and the webhook (uses Stripe signature)

