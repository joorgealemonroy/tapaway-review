Mirror the Personal-side SMS Marketing system onto the Restaurant (Venue Pack) side: new restaurant-scoped subscriber + campaign tables, a public opt-in drawer on the review hub, an SMS Marketing tab on the restaurant Dashboard (locked behind the same "Coming Soon / Pending Carrier Approval" banner), and edge functions that handle both account types.

## 1. Database (migration)

Create two restaurant-scoped tables that mirror the Personal-side schema:

- `restaurant_sms_subscribers` — `id`, `restaurant_id` (FK→ restaurants), `name`, `phone`, `sms_opt_in` (default true), `sms_opt_in_at`, `created_at`. Index on `restaurant_id` and on `phone` (for the STOP webhook lookup).
- `restaurant_sms_campaigns` — mirrors `sms_campaigns`: `id`, `restaurant_id`, `user_id`, `message`, `recipient_count`, `success_count` (default 0), `failure_count` (default 0), `created_at`.

RLS:
- `restaurant_sms_subscribers`: public INSERT (mirrors `personal_email_captures` lead-capture pattern); SELECT/UPDATE/DELETE restricted to the restaurant owner (`restaurants.owner_id = auth.uid()`) plus `is_admin()`.
- `restaurant_sms_campaigns`: SELECT/INSERT restricted to the restaurant owner + admin; no public access.

## 2. Public opt-in drawer (Review Hub)

- New component `src/components/restaurant/RestaurantSmsOptInDrawer.tsx` — copy of `SmsOptInDrawer` but inserts into `restaurant_sms_subscribers` with `restaurant_id` instead of `profile_id`.
- Add a "Join our VIP Text List" CTA button on `src/pages/ReviewHub.tsx`, placed in the action button stack alongside the Google/Yelp/Instagram links. Opens the drawer.
- Same compliance copy: "By joining, you agree to receive recurring marketing text messages. Msg & data rates may apply. Reply STOP to opt out."

## 3. Restaurant Dashboard tab

- New component `src/components/restaurant/RestaurantSmsMarketingTab.tsx` — mirror of `SmsMarketingTab` but queries `restaurant_sms_subscribers` and `restaurant_sms_campaigns` by `restaurant_id`, and invokes `send-mass-sms` with `{ restaurant_id, message }`.
- Includes the identical yellow "🚧 SMS Marketing is currently pending carrier approval. Mass texting will be unlocked in a few days!" banner and the `SENDING_LOCKED = true` flag that disables the Send button (renders "Coming Soon"). Subscriber count and history remain visible.
- In `src/pages/Dashboard.tsx`, add a new `<TabsTrigger value="sms">SMS</TabsTrigger>` (bumping the grid from `md:grid-cols-7` → `md:grid-cols-8`, and `md:grid-cols-4` → `md:grid-cols-5` for demo view) and a matching `<TabsContent value="sms">` rendering the new component with the current restaurant id.

## 4. Edge function updates

`send-mass-sms`:
- Accept either `profile_id` (existing personal flow) **or** `restaurant_id`. Branch on which is present.
- Restaurant branch: verify caller owns the restaurant (`restaurants.owner_id = userId`) or is admin; pull recipients from `restaurant_sms_subscribers` filtered by `sms_opt_in = true`; sender name = `restaurants.restaurant_name`; log into `restaurant_sms_campaigns`. All other logic (Twilio gateway call, batching, STOP suffix, dedupe) is unchanged.

`twilio-webhook` (STOP handler):
- After matching an opt-out keyword, run the existing `personal_email_captures` update **and** an additional update on `restaurant_sms_subscribers` setting `sms_opt_in = false where phone = from`. Log row counts from each so we can see which list the number was on.

## 5. Notes

- The Send button stays locked on both Personal and Restaurant tabs (single shared `SENDING_LOCKED` constant in each component) — backend is wired and tested-ready, but UI prevents broadcasting until carrier approval lands.
- Twilio connector + `TWILIO_FROM_NUMBER` + `LOVABLE_API_KEY` are already configured; no new secrets required.
- Frontend types regenerate automatically after migration — components use `as any` casts where needed (matching the existing Personal SMS pattern) until types are refreshed.

## Files

Created:
- `src/components/restaurant/RestaurantSmsOptInDrawer.tsx`
- `src/components/restaurant/RestaurantSmsMarketingTab.tsx`
- New migration for the two tables + RLS

Edited:
- `src/pages/ReviewHub.tsx` — add VIP Text List button + drawer state
- `src/pages/Dashboard.tsx` — add SMS tab trigger + content
- `supabase/functions/send-mass-sms/index.ts` — branch on profile vs restaurant
- `supabase/functions/twilio-webhook/index.ts` — opt-out across both tables
