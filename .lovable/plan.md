
# Fix the real onboarding failure and remove the outdated trial page

## What I confirmed

### 1. The account creation error is misleading
`create-email-signup` is working for your test email.

I verified the network call:
- `POST /functions/v1/create-email-signup`
- status `200`
- response includes `userId` and `tempPassword`

So the visible “Failed to create account” message is not coming from auth creation anymore.

### 2. The actual failure is restaurant creation in `Onboarding.tsx`
The failing request is:

- `POST /rest/v1/restaurants?select=id`
- status `409`
- error: `duplicate key value violates unique constraint "restaurants_custom_slug_key"`

That means onboarding is failing later when inserting the `restaurants` row.

### 3. Why the current fallback still fails
The current code does this after the duplicate slug error:

- tries to look up a restaurant by:
  - `custom_slug = slug`
  - `owner_id = uid`

But the network trace shows:
- the insert fails with duplicate slug
- then the follow-up owner lookup still returns `[]`

So the conflicting row exists, but it is not visible under that owner lookup. Most likely it is:
- an orphaned row from prior testing
- or a row not owned by the current user
- or not deletable/recoverable through the current dev reset path

Because `rId` stays empty, the code hits:
- `toast.error("Failed to create account")`

That is the exact error you keep seeing.

### 4. The wrong 30-day page is a legacy `/paywall` screen
The screenshot matches `src/pages/Paywall.tsx`.

That file still contains outdated copy such as:
- “Start Your Free 30-Day TapAway Trial”
- “$0 due today”
- “After the trial: $30/month”
- a Stripe payment-link CTA

This page is still reachable because several places still route users to `/paywall`, including:
- `src/pages/Dashboard.tsx`
- `src/pages/DashboardSelector.tsx`
- `src/pages/Auth.tsx`
- marketing links like `src/components/landing/NewHero.tsx`
- `/paywall` route still exists in `src/App.tsx`

So the page is not accidental; it is still wired into the app.

## Root causes

1. **Primary bug:** onboarding still depends on inserting a `restaurants` record even for Solo Pro, and that insert is failing on slug collisions.
2. **Secondary bug:** the duplicate-slug fallback is too narrow because it only recovers rows visible under the current `owner_id`.
3. **Product bug:** legacy `/paywall` is still live and contains obsolete trial/pricing messaging.
4. **Dev-reset gap:** the reset button is not clearing enough state to guarantee clean re-tests.

## Implementation plan

### 1. Fix Solo Pro onboarding so duplicate restaurant slugs do not block account creation
In `src/pages/Onboarding.tsx`:

- Keep the current flow for Venue Pack.
- For Solo Pro / personal onboarding:
  - stop treating `restaurants` creation as mandatory for success
  - if restaurant insert fails with slug collision, continue with Magic Onboarding instead of hard failing
  - only require `restaurants` row for true restaurant flows

This is the safest fix because Solo Pro should end in the personal dashboard anyway.

### 2. Make slug-collision handling robust for business flows
Still in `src/pages/Onboarding.tsx`:

- replace the current owner-only fallback with stronger recovery:
  - first try existing row by `owner_id`
  - if not found, try a broader collision strategy
  - if the slug is already taken by another row, generate a unique fallback slug automatically instead of aborting
- update the restaurant insert path so it never ends with `rId = null` on a recoverable slug conflict

This removes the current dead-end that surfaces as “Failed to create account”.

### 3. Remove the obsolete 30-day free-trial paywall experience
In `src/pages/Paywall.tsx` and routing/callers:

- either retire `/paywall` entirely and redirect it to `/onboarding`
- or replace the screen with current offer messaging and no obsolete trial copy

Given your message, I’d plan to **retire it**:
- route `/paywall` to `/onboarding`
- update all `navigate("/paywall")` and `href="/paywall"` usages to the correct current flow

Targets already confirmed:
- `src/pages/Dashboard.tsx`
- `src/pages/DashboardSelector.tsx`
- `src/pages/Auth.tsx`
- `src/components/landing/NewHero.tsx`
- `src/App.tsx`

### 4. Clean up stale local trial/paywall flags
There are still legacy flags influencing paywall behavior:
- `tapaway_pending_setup`
- `tapaway_pending_trial`
- `tapaway_trial_intent`

I’ll update cleanup logic so successful onboarding and dev reset both clear all of them consistently. That prevents old paywall/trial state from reviving outdated flows.

### 5. Strengthen the Developer Reset button
In `src/components/admin/DeveloperResetButton.tsx`:

- clear the centralized onboarding key `tapaway_onboarding_data`
- clear all legacy trial/onboarding flags
- surface delete failures clearly
- ensure reset actually returns the app to a clean `/onboarding` state

## Files to change

- `src/pages/Onboarding.tsx`
- `src/components/admin/DeveloperResetButton.tsx`
- `src/pages/Paywall.tsx` or `src/App.tsx` route handling
- `src/pages/Dashboard.tsx`
- `src/pages/DashboardSelector.tsx`
- `src/pages/Auth.tsx`
- `src/components/landing/NewHero.tsx`

## Expected result after fix

- Solo Pro onboarding will no longer fail just because a restaurant slug already exists.
- The misleading “Failed to create account” toast will stop appearing for this case.
- Users will no longer land on the obsolete “30-day free trial” page.
- Admin/test loops will reset cleanly and start from the current onboarding flow.
