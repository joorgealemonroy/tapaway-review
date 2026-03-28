

# Redesign /onboarding: 3-Step Premium Dark Funnel

## Overview

Replace the current 4-step onboarding (`Onboarding.tsx`) with a new 3-step, dark-themed, high-converting funnel: Plan Selection → Loss Protection Upsell → Business Info + Auth. The existing business logic (restaurant creation, Google connection, logo upload, OTP verification, finalize-onboarding) will be preserved and rewired into the new flow.

## Step 1: Plan Selection ("What's your setup?")

- Dark background (`bg-[#0a0e1a]`), single-column, `max-w-md` centered
- Two large selectable cards side by side (stacked on narrow screens):
  - **Solo Pro** — "For Barbers, Realtors, and Creators" — $15/mo — 3 Branded NFC Cards
  - **Venue Pack** — "For Restaurants, Salons, and Retail" — $39/mo — 15 Branded NFC Cards
- Selected card gets an electric blue (`#3B82F6`) border glow + checkmark
- "Continue" button appears after selection, slides in from bottom
- Store selection in local state (`plan: 'solo' | 'venue'`)

## Step 2: Loss Protection Upsell ("Safety Net")

- Headline: "Customers love these cards. Sometimes too much."
- Body copy about cards walking home with guests
- Premium-looking dark card with subtle gradient border showing:
  - "Loss Protection — $5/mo"
  - Dynamic detail based on Step 1: Solo → "3-card refills + Priority Shipping" / Venue → "10-card refills + Priority Shipping"
  - Shield icon for trust
- Primary button: "Add Protection" (adds $5 to total)
- Secondary text link: "No thanks, I'll pay $10 + shipping per replacement"
- Running price total displayed at bottom (e.g., "$39 + $5 = $44/mo")

## Step 3: Business Info + Auth (Frictionless)

- Business Name input with placeholder "e.g., Joe's Pizza"
- As user types, a small 3D NFC card preview updates with their business name (reuse `TapAwayCard3D` component, overlay text on front face)
- Shipping Address input with Google Places autocomplete (reuse existing `GooglePlacesAutocomplete` component)
- Google and Apple OAuth buttons (large, full-width, stacked)
- Dynamic price summary: "Start Growing — $XX/mo" as the final CTA button
- On auth success → create restaurant record, create fulfillment order, mark onboarding complete, navigate to `/dashboard`

## Visual & Animation Details

- All transitions between steps use `framer-motion` horizontal slide (`translateX`)
- Progress bar at top: 3 dots/segments with electric blue fill
- Font: existing system font stack, but headings use `font-black`
- Action color: electric blue `#3B82F6` for buttons, borders, progress
- Cards use `bg-[#111827]` with `border-[#1f2937]`, hover state brightens border

## Technical Details

### Files to modify
- **`src/pages/Onboarding.tsx`** — Full rewrite of the UI layer. Keep all existing edge function calls, Supabase queries, and auth logic. Restructure into 3 steps with new state machine: `'plan' | 'protection' | 'info' | 'success'`

### Files to reference (no changes)
- `src/components/TapAwayCard3D.tsx` — Import and render with business name overlay
- `src/components/GooglePlacesAutocomplete.tsx` — Reuse for address input
- `src/integrations/supabase/client.ts` — Existing Supabase client
- `src/lib/onboardingData.ts` — Continue using for localStorage persistence

### Data flow
- Plan selection + protection choice stored in component state and passed to restaurant creation
- On Step 3 completion: call existing `saveFormDataAndCreateRestaurant`, `handleComplete` logic
- Store plan type in restaurant record (reuse `type` field or add to fulfillment order metadata)

### Auth approach
- Google OAuth via existing `lovable.auth.signInWithOAuth("google")` 
- Apple OAuth via `lovable.auth.signInWithOAuth("apple")`
- On successful auth → auto-submit Step 3 data → redirect to dashboard

