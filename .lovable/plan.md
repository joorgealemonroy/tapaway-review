

# Cards Tab Implementation

## Step 1: Create Stripe Prices via Temporary Edge Function
Deploy a temporary edge function that uses `STRIPE_SECRET_KEY` to create two Stripe products/prices:
- **Card Club**: $5/mo recurring subscription
- **One-Time Card Order**: $10 one-time payment

Retrieve the `price_xxx` IDs, add them to `src/lib/constants.ts`, then delete the temp function.

## Step 2: Database Migration
```sql
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS has_card_addon boolean NOT NULL DEFAULT false;

CREATE TABLE public.personal_card_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  is_addon boolean NOT NULL DEFAULT false,
  shipping_name text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text DEFAULT 'US',
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: users see/insert own rows, admins full access
```

## Step 3: New Component — `CardsTab.tsx`
Two-state UI:

**Card Club member** (`has_card_addon = true`):
- "Card Club Member" badge, monthly quota (3 max, counting pending+shipped)
- Quantity selector, shipping address form (pre-filled from last request)
- "Request Cards (Free)" button

**Non-member** (`has_card_addon = false`):
- Card Club promo → "Subscribe $5/mo" button → Stripe checkout
- Divider → "$10 One-Time Order" button → Stripe checkout
- Both collect shipping address

## Step 4: Edge Function — `create-card-order`
Three flows:
1. **Free request** (Card Club): validate quota (sum quantities where status IN pending/shipped, current month), insert row, send internal email
2. **Card Club subscribe**: create Stripe Checkout for $5/mo recurring with `metadata.type = 'card_addon'`
3. **One-time $10**: create Stripe Checkout for $10 with `metadata.type = 'card_onetime'`, shipping collection enabled

## Step 5: Update `stripe-webhook/index.ts`
Add handlers in the `checkout.session.completed` block:
- `metadata.type === 'card_addon'`: set `has_card_addon = true`, insert initial card request with shipping from Stripe
- `metadata.type === 'card_onetime'`: insert card request with shipping from Stripe
- Initial fulfillment trigger: on any new personal subscription checkout, if no prior card requests exist for that profile, create a "pending" 3-card shipment record

In `customer.subscription.deleted`: check if the deleted subscription's price matches the Card Club price → set `has_card_addon = false`.

## Step 6: Wire Up Dashboard
- Add `has_card_addon` to `PersonalProfile` interface and query in `PersonalDashboard.tsx`
- Add `<TabsContent value="cards">` rendering `<CardsTab>`
- Update `MobileBottomNav.tsx`: change Cards description from "Coming soon" to "Request NFC cards"

## Files Changed
- `src/lib/constants.ts` — add `CARD_ADDON_PRICE_ID`, `CARD_ONETIME_PRICE_ID`
- `src/components/personal/CardsTab.tsx` — new
- `src/pages/personal/PersonalDashboard.tsx` — add tab content + interface field
- `src/components/personal/MobileBottomNav.tsx` — update description
- `supabase/functions/create-card-order/index.ts` — new
- `supabase/functions/stripe-webhook/index.ts` — add card addon/onetime handlers
- Database migration for `has_card_addon` column + `personal_card_requests` table

