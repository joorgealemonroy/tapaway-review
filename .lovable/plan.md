

# Rep-Assisted In-Person Close — Implementation Plan

## Overview

Add a streamlined "Rep Mode" to the onboarding flow so a sales rep can sign up a client in person by simply entering the client's email, selecting the business via Google, and handing the device over for Stripe payment. No OAuth required for the client.

## Flow

```text
Rep Mode (in-person):
  Plan → Protection → Business Info + Client Email → Stripe → Success Page (no auth)
                                                              ↓
                                                   Client gets invite email to set password later
```

## Changes

### 1. New Edge Function: `create-rep-onboarding`

Server-side function that handles the entire rep-assisted signup:

- **Auth**: Extracts the rep's JWT from the `Authorization` header, verifies it, and confirms the caller exists in `sales_reps` with `is_active = true`. Rejects otherwise.
- **Existing email handling**: Uses service role client to call `get_auth_user_by_email(email)` (existing RPC). If user exists, grabs their `user_id`. If not, calls `admin.auth.admin.inviteUserByEmail(email)` to create the user and send them a password-setup invite automatically.
- **Restaurant creation**: Creates the restaurant record with all business data (name, address, Google Place ID, review URL, logo, plan, protection, trial dates). If user already has a restaurant, updates it.
- **Rep attribution**: Links to `rep_restaurants` table for commission tracking, stores `sales_rep_id` in Stripe metadata.
- **Stripe checkout**: Calls Stripe to create a checkout session with `success_url` pointing to `/rep-checkout-success` (a new unauthenticated page) and `cancel_url` back to `/onboarding?rep=true`.
- **Returns**: The Stripe checkout URL to the frontend.

Rate limited (10/hour/IP). Input validated with Zod.

### 2. New Page: `RepCheckoutSuccess` (`/rep-checkout-success`)

A clean, standalone success page that requires **no authentication**. Displays:
- "Payment successful!"
- "Please check your email for a link to set up your dashboard."
- TapAway branding, no navigation to authenticated areas.

Route added to `App.tsx` before the catch-all.

### 3. Modified: `Onboarding.tsx`

- Detect `?rep=true&rep_id=<uuid>` in URL params.
- In rep mode, Step 3 replaces the OAuth buttons with:
  - "Owner's Email" input field
  - "Continue to Checkout" button
- On submit: calls `create-rep-onboarding` edge function with the rep's auth token in the header, passing all collected data (plan, protection, business info, Google place, logo, email).
- On success: redirects to the Stripe checkout URL returned by the function.
- The rep must be logged in for this to work (their session token is sent). If not logged in, the OAuth buttons show as normal.

### 4. Modified: `RepClose.tsx`

Update the "Generate Link" flow to offer an option to use the new in-person onboarding flow instead of (or in addition to) the current standalone checkout link generation. Add a button/option that navigates to `/onboarding?rep=true&rep_id={salesRep.id}`.

## Security

| Concern | Mitigation |
|---------|-----------|
| Anyone typing `?rep=true` | Edge function verifies JWT + checks `sales_reps` table |
| Existing emails | Checks auth.users first, reuses existing user_id |
| Client session pollution | Stripe redirects to unauthenticated success page |
| Invite email | Uses Supabase `inviteUserByEmail` — battle-tested, sends secure magic link |
| Rate limiting | 10 requests/hour/IP on the edge function |
| Input validation | Zod schema for all fields |

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/create-rep-onboarding/index.ts` | **New** — core edge function |
| `src/pages/RepCheckoutSuccess.tsx` | **New** — unauthenticated success page |
| `src/pages/Onboarding.tsx` | **Modify** — add rep mode with email input |
| `src/pages/rep/RepClose.tsx` | **Modify** — add in-person close option |
| `src/App.tsx` | **Modify** — add `/rep-checkout-success` route |

