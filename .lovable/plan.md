

# Native Calendar & Booking System — Updated Architecture

## Summary
Build a native scheduling system with proper timezone handling and per-product durations. Creators set weekly availability with their local timezone. Buyers see slots converted to their own timezone. Slot duration comes from the product, not the availability table.

## Database Changes

### New Table: `creator_availability`
```sql
CREATE TABLE public.creator_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, day_of_week)
);
ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;
-- Creators CRUD own; public SELECT all
```

### New Table: `bookings`
```sql
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  buyer_email text,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC', -- creator's timezone at time of booking
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- Anyone INSERT; creators SELECT own; public SELECT for slot-blocking
```

### Alter `creator_products`
```sql
ALTER TABLE public.creator_products
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN booking_url text;
```

No `slot_duration_minutes` on availability — duration is per-product.

## RLS Policies

| Table | Rule |
|-------|------|
| `creator_availability` | Creators CRUD own rows (via `personal_profiles.user_id = auth.uid()`); anon/public SELECT all |
| `bookings` | Anyone can INSERT; creators SELECT where `creator_id` matches their profile; public SELECT (`status = 'paid'` or recent pending) for slot blocking |

## File Changes

### 1. `src/components/personal/PersonalShopTab.tsx`
- Add `"booking"` to product type dropdown (Calendar icon)
- Show `duration_minutes` input (15/30/45/60 dropdown) when type is booking
- Skip file upload requirement for booking products
- Add an "Availability" section (7-day grid with toggle + start/end time per day)
- Auto-detect creator's browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Save availability rows to `creator_availability` with detected timezone
- Add `duration_minutes` to `CreatorProduct` interface and save/load logic

### 2. New: `src/components/personal/BookingCalendar.tsx`
- Props: `creatorId`, `productId`, `durationMinutes`, `priceCents`, `onBook(bookingId)`
- Fetch `creator_availability` for the creator
- Use `react-day-picker` Calendar (already in project)
- **Timezone conversion**: For each date selected, take creator's `start_time`/`end_time` + `timezone`, convert to buyer's local timezone using `Intl.DateTimeFormat` / manual UTC offset math
- Generate slots of `durationMinutes` length in buyer-local time
- Query `bookings` for that date — exclude slots where status is `paid` or (`pending` and created < 15 min ago)
- Gray out dates with no availability or fully booked
- Buyer enters email, picks slot, clicks "Pay $X to Lock In"
- On click: insert `bookings` row (status=`pending`, store date/time in creator's timezone), then call `create-product-checkout` with `bookingId`

### 3. `src/components/personal/ProductPreviewModal.tsx`
- Add `duration_minutes`, `booking_url`, `product_type` to `Product` interface
- When `product_type === "booking"`, render `BookingCalendar` instead of "Buy Now" button
- Update `onBuy` signature to accept optional `bookingId`

### 4. `src/pages/personal/PersonalProfilePage.tsx`
- Add `duration_minutes` to product queries
- Update `handleBuyProduct` to accept optional `bookingId`
- Pass `bookingId` to `create-product-checkout`
- Post-purchase success for booking: show "Booking confirmed!" message instead of download link
- Change button text to "Book Now" for booking products

### 5. `supabase/functions/create-product-checkout/index.ts`
- Accept optional `bookingId` in request body
- Include `booking_id` in Stripe session metadata
- For booking products, adjust success_url to include `booking=success`

### 6. `supabase/functions/stripe-webhook/index.ts`
- In the `creator_marketplace` block, check for `booking_id` in metadata
- If present: update `bookings` row to `status = 'paid'`
- Send booking confirmation emails to both creator and buyer via Resend (date, time, timezone info)

## Timezone Flow

```text
Creator sets: 9:00 AM - 5:00 PM, timezone = "America/Los_Angeles"
Product duration: 30 min

Buyer in "America/New_York" opens calendar:
  -> Fetch availability: day=1 (Mon), start=09:00, end=17:00, tz=America/Los_Angeles
  -> Convert to buyer's tz: 12:00 PM - 8:00 PM ET
  -> Generate 30-min slots: 12:00, 12:30, 1:00, ... 7:30 PM ET
  -> Remove booked slots
  -> Display in buyer's local time

On booking insert: store date + start_time in creator's timezone
  -> Webhook email shows both timezones to creator and buyer
```

## Files Created/Modified

| File | Action |
|------|--------|
| Migration SQL | Create `creator_availability`, `bookings`, alter `creator_products` |
| `src/components/personal/BookingCalendar.tsx` | **New** |
| `src/components/personal/PersonalShopTab.tsx` | Add booking type, availability UI, duration field |
| `src/components/personal/ProductPreviewModal.tsx` | Render BookingCalendar for bookings |
| `src/pages/personal/PersonalProfilePage.tsx` | Handle booking purchase flow |
| `supabase/functions/create-product-checkout/index.ts` | Pass booking_id |
| `supabase/functions/stripe-webhook/index.ts` | Update booking status + emails |

