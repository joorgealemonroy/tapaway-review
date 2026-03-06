

# Creator Marketplace End-to-End Testing Setup

This plan adds a testing harness to let you simulate the full marketplace flow without real Stripe onboarding, plus a test console for real-time webhook feedback.

---

## 1. "Simulate Stripe Connect" Button (Dashboard)

**File: `src/components/personal/PersonalShopTab.tsx`**

Add a "Test Mode: Simulate Connect" button (only visible in dev) on the pre-onboarding screen. When clicked, it directly updates the profile in the database with a fake `stripe_connect_account_id` (`acct_test_xxx`) and sets `is_stripe_onboarded = true`, then calls `onProfileUpdate()` to reload. This bypasses real Stripe identity checks so you can immediately access the product management UI.

```typescript
// Only in dev mode
if (import.meta.env.DEV) {
  // Show "Simulate Connect (Test)" button
  // On click: update personal_profiles set stripe_connect_account_id = 'acct_test_' + randomId, is_stripe_onboarded = true
}
```

---

## 2. Test Product Creation + Checkout Link Generator

After simulating connect, you'll use the existing product form to create a test product (upload a small PDF, set price to $1.00).

**Add a "Generate Test Checkout Link" button** on each product card in the dashboard (dev-only). This calls `create-product-checkout` with the product ID and displays the returned Stripe Checkout URL in a copyable text field. You can then open it in a browser and use test card `4242 4242 4242 4242`.

**However**: The `create-product-checkout` edge function checks `is_stripe_onboarded` and requires a real `stripe_connect_account_id` for Stripe's `transfer_data.destination`. A fake `acct_test_xxx` will fail at Stripe's API.

**Solution**: Add a **test mode bypass** in `create-product-checkout` that, when `productId` starts with `test_` OR a `testMode: true` flag is passed, skips the `transfer_data` / `application_fee_amount` and creates a simple checkout session on the platform account directly. This lets the checkout succeed in test mode.

**File: `supabase/functions/create-product-checkout/index.ts`**
- Accept optional `testMode` boolean
- When true, omit `payment_intent_data` (no destination/fee), add `metadata.test_mode: 'true'`

---

## 3. Webhook Verification + Test Console

### 3a. Webhook already handles marketplace purchases

The `stripe-webhook` already processes `checkout.session.completed` with `metadata.type === 'creator_marketplace'`. It creates the `creator_purchases` record with access token. This will fire automatically when the test checkout completes.

### 3b. Add a "Test Console" panel to the Shop tab (dev-only)

**File: `src/components/personal/PersonalShopTab.tsx`**

Add a collapsible "Test Console" at the bottom of the shop tab that:
- Polls `creator_purchases` every 5 seconds for new records matching the creator's products
- Displays each purchase with: `stripe_session_id`, `buyer_email`, `access_token`, `access_expires_at`, and a computed download URL
- Shows a green checkmark when a new purchase appears (webhook succeeded)
- Provides a "Test Download" button that opens the `download-product` edge function URL with the access token

---

## 4. Download Verification

The test console's "Test Download" button constructs the URL:
```
{SUPABASE_URL}/functions/v1/download-product?token={access_token}
```
Clicking it triggers the `download-product` edge function which validates the token, checks expiry, and returns a 302 redirect to a signed URL for the file in the private `creator-files` bucket.

---

## 5. Profile Page Purchase Banner

**File: `src/pages/personal/PersonalProfilePage.tsx`**

The profile page already checks for `?purchase=success&session_id=...` query params. Verify it shows a success banner and the download link. Add a lookup: when these params are present, query `creator_purchases` by `stripe_session_id` to get the `access_token`, then show a "Download Your Purchase" button that links to the download function.

Currently the profile page likely doesn't have this lookup — need to add it.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/personal/PersonalShopTab.tsx` | Add dev-only "Simulate Connect" button, "Generate Test Checkout" per product, "Test Console" panel polling purchases |
| `supabase/functions/create-product-checkout/index.ts` | Add `testMode` bypass that skips `transfer_data` for platform-only checkout |
| `src/pages/personal/PersonalProfilePage.tsx` | Add post-purchase lookup by `session_id` to show download banner with access token link |

No database changes needed — all tables and buckets already exist.

