

# NFC Card Activation System

## Overview

Build a system where pre-programmed NFC cards (each with a unique URL like `tapaway.co/c/AB12CD`) can be sold without being tied to any user. When tapped, the card either redirects to the owner's profile (if claimed) or shows an activation flow (if unclaimed).

## How It Works

```text
User taps NFC card
       |
       v
tapaway.co/c/AB12CD
       |
       v
  Card lookup
   /        \
Claimed?    Unclaimed?
  |              |
  v              v
Redirect to   Show activation
/username      screen
               |
               v
          Enter claim code
          (from packaging)
               |
               v
          Login or create
          account (OTP)
               |
               v
          Pick username
               |
               v
          Card linked!
          Redirects to /username
```

---

## Database Changes

### New table: `nfc_cards`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| public_code | text | Unique, uppercase alphanumeric (e.g. "AB12CD"), used in URL |
| claim_code_hash | text | SHA-256 hash of the secret claim code from packaging |
| status | text | "unclaimed", "claimed", "disabled" (default: "unclaimed") |
| owner_user_id | uuid | Nullable, set when claimed |
| destination_type | text | "profile" or "url" (default: "profile") |
| destination_value | text | Username or custom URL the card redirects to |
| claimed_at | timestamptz | Nullable, set when claimed |
| created_at | timestamptz | Default now() |
| batch_id | text | Nullable, for tracking production batches |

### New table: `nfc_card_taps` (analytics)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| card_id | uuid | FK to nfc_cards |
| tapped_at | timestamptz | Default now() |
| user_agent | text | Nullable |
| ip_hash | text | Nullable, hashed for privacy |

### RLS Policies

**nfc_cards:**
- Public SELECT on `public_code`, `status`, `destination_type`, `destination_value` (needed for redirect lookup)
- Owner can UPDATE their own cards (`owner_user_id = auth.uid()`)
- Admin full access
- No public INSERT/DELETE

**nfc_card_taps:**
- Public INSERT (anonymous taps need to be recorded)
- Owner can SELECT taps for their cards
- Admin full access

---

## Route Addition

Add `/c/:code` route in `App.tsx` pointing to a new `CardResolver` page. Also add "c" to the reserved usernames list so it can't conflict with the `/:slug` resolver.

---

## New Pages and Components

### 1. `src/pages/CardResolver.tsx`
- Reads `:code` param from URL
- Queries `nfc_cards` by `public_code`
- If **claimed** and status is active: instant redirect to `/${destination_value}`
- If **unclaimed**: render the `CardActivation` component
- If **disabled** or not found: show a "Card not found" message
- Also inserts a tap record into `nfc_card_taps`

### 2. `src/pages/CardActivation.tsx`
Multi-step activation flow:

**Step 1 - Enter Claim Code**
- Clean screen: "Activate your TapAway card"
- Input field for the 6-character claim code from the card packaging
- Rate-limited: max 5 attempts per card per 10 minutes
- On correct code, proceed to Step 2

**Step 2 - Account (Login or Create)**
- If already logged in: skip to Step 3
- If not logged in: show email input, send OTP (reuses existing `send-custom-otp` and `verify-custom-otp` edge functions), create password
- If existing account detected: prompt login instead

**Step 3 - Choose Username**
- If user already has a personal profile: show option to link card to existing profile OR create a new username
- If new user: username picker with availability check (reuses existing `is_username_available` DB function)
- Username suggestions if taken

**Step 4 - Confirmation**
- "Your card is live!" with confetti
- Shows `tapaway.co/{username}`
- "Tap your card to try it" prompt
- Button to go to dashboard

### 3. `src/components/card/ClaimCodeInput.tsx`
- 6-character input (similar to OTP input, reuses `InputOTP` component)
- Visual feedback on correct/incorrect

---

## New Edge Function: `claim-nfc-card`

Handles the secure claim process server-side:

1. Accepts: `{ publicCode, claimCode, username? }`
2. Validates the claim code against stored hash
3. Rate limits claim attempts (max 5 per card per 10 min)
4. Requires authenticated user (JWT validation)
5. Checks if card is still unclaimed
6. If user has no personal profile yet, creates one (reuses logic from `create-personal-account`)
7. Updates card: `status = "claimed"`, `owner_user_id`, `destination_value = username`, `claimed_at = now()`
8. Returns success with profile URL

---

## New Edge Function: `admin-create-nfc-cards` (batch creation)

Admin-only function to generate card batches:

1. Accepts: `{ count, batchId? }`
2. Generates `count` cards, each with:
   - Random 6-char alphanumeric `public_code` (uppercase, collision-checked)
   - Random 8-char `claim_code` (mixed case + digits)
   - Stores `claim_code_hash` (SHA-256)
3. Returns the list of cards with their **plaintext claim codes** (only time they're visible) for printing on packaging
4. Admin can export this as CSV for the card manufacturer

---

## Security

- **NFC link alone cannot claim a card** -- the secret claim code from packaging is always required
- **Claim code is stored hashed** (SHA-256) -- even a database breach won't expose claim codes
- **Rate limiting** on claim attempts prevents brute force (5 attempts per 10 min per card)
- **Only the owner** (authenticated user whose `user_id` matches `owner_user_id`) can change the card's destination or disable it
- **Admin-only** batch creation -- no public card creation endpoint
- Cards can be **disabled** by owner or admin (e.g., if lost/stolen)

---

## Integration with Existing System

- The activation flow creates a `personal_profiles` record with `subscription_status = "active"` (card purchase = paid plan)
- Card users land on the same personal dashboard as signup users
- The `RequestMoreCards` component in the dashboard can be updated to also show linked NFC cards
- Future: admin panel page to view/manage all cards and batches

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/CardResolver.tsx` | Route handler for `/c/:code` -- redirect or activate |
| `src/pages/CardActivation.tsx` | Multi-step activation flow |
| `src/components/card/ClaimCodeInput.tsx` | 6-char claim code input |
| `supabase/functions/claim-nfc-card/index.ts` | Server-side claim logic |
| `supabase/functions/admin-create-nfc-cards/index.ts` | Batch card generation |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/c/:code` route |
| `src/lib/reservedUsernames.ts` | Add "c" to reserved list |
| `supabase/config.toml` | Add JWT config for new edge functions |

## Database Migration

- Create `nfc_cards` table with RLS
- Create `nfc_card_taps` table with RLS
- Add index on `nfc_cards.public_code` for fast lookups

