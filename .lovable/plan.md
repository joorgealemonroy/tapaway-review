

# Post-Purchase Emails & Creator Sales Dashboard

## 1. Webhook Update — Email Sending

**File: `supabase/functions/stripe-webhook/index.ts`**

In the existing `creator_marketplace` block (lines 448-482), after creating the purchase record, add non-blocking email sending using Resend (already configured via `RESEND_API_KEY` secret):

**Buyer Email:**
- Subject: "Your purchase: {product title}"
- Body: Product name, price, secure download link (`FRONTEND_URL/functions/v1/download-product?token={accessToken}`), 72-hour expiry note
- Sent from `EMAIL_FROM` env var

**Creator Notification Email:**
- Look up the creator's email via `personal_profiles.user_id` → `auth.users.email`
- Subject: "You made a sale! 🎉"
- Body: Product title, buyer email (masked), amount earned, link to dashboard

Both emails are fire-and-forget (wrapped in try/catch, don't block the webhook response).

## 2. Sales Dashboard in PersonalShopTab

**File: `src/components/personal/PersonalShopTab.tsx`**

Add a "Sales Summary" section at the top of the onboarded view (between the shop toggle and "Your Products" header), only visible when `isStripeOnboarded`:

**Sales Summary Header Card:**
- **Total Earnings**: Sum of `price_cents` from `creator_products` joined with `creator_purchases` for this creator's products
- **Total Sales**: Count of purchases
- Displayed as two stat cards side-by-side with DollarSign and ShoppingBag icons

**Recent Transactions Table:**
- Below the summary, a scrollable list showing the last 10 sales
- Columns: Buyer Email (truncated), Product Name, Date, Price
- Fetched via a join query: `creator_purchases` with `creator_products` filtered by `creator_id = profileId`
- Uses the existing Table components from `@/components/ui/table`

**Data fetching:**
- New `loadSalesData` callback that runs on mount when onboarded
- Single query using `.select('*, product:creator_products!product_id(title, price_cents, creator_id)')` filtered by creator_id
- Stored in local state: `salesTotal`, `salesCount`, `recentSales`

## 3. No Database Migration Needed

The `creator_purchases` table already has all needed columns (`buyer_email`, `product_id`, `created_at`, `stripe_session_id`). Product price is available via the join to `creator_products.price_cents`.

## 4. Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add Resend email sending for buyer + creator after marketplace purchase |
| `src/components/personal/PersonalShopTab.tsx` | Add sales summary header + recent transactions table |

