## Goal
Make the top banner context-aware: show the "Finish Setup" message only to users who have genuinely started the trial/setup, and show a marketing offer banner ("$0 Today + Free Shipping") to everyone else on public/landing pages.

## Current behavior
`src/components/TrialBanner.tsx` reads three localStorage flags (`tapaway_pending_trial`, `tapaway_trial_intent`, `tapaway_pending_setup`) and shows the "You started your TapAway trial — let's finish setup!" bar whenever any are set and onboarding isn't complete. Anyone who ever clicked a CTA that set `trial_intent` sees it even if they never really began setup. New visitors see nothing.

## Changes

### 1. Tighten the "Finish Setup" trigger
In `TrialBanner.tsx`, only treat a user as having "actually started setup" when a stronger signal exists:
- `tapaway_pending_trial === 'true'` (they hit the paywall/checkout success), OR
- `tapaway_pending_setup === 'true'` (Stripe returned them mid-setup)

Drop `tapaway_trial_intent` from the trigger — it fires from a simple CTA click and produces false positives. (Leave the flag itself untouched elsewhere; just don't use it to show the banner.)

### 2. Add an OfferBanner for everyone else
New component `src/components/OfferBanner.tsx` with the same visual style as `TrialBanner` (cyan/primary bar, dismissible, same top offset) but content:
- Message: "Zero setup. $0 today + free shipping on your NFC cards."
- CTA: "Claim Offer" → links to `/start` (same entry point the hero uses)
- Dismissible via an `X`; remember dismissal for the session with `sessionStorage` key `tapaway_offer_dismissed` so it doesn't nag on every route change.

Visibility rules:
- Hide on the same excluded paths as `TrialBanner` (`/start`, `/paywall`, `/onboarding*`, `/auth`, `/dashboard`, plus `/admin`, `/rep`, `/affiliate` to keep it off internal tools).
- Hide if the user is signed in (`useAuth().user` present) — no point pitching signup to an existing user.
- Hide if `TrialBanner` is showing (mutually exclusive; TrialBanner takes precedence).

### 3. Wire it into the app
Wherever `<TrialBanner />` is currently rendered (likely `src/App.tsx`), render `<OfferBanner />` right after it. The two components decide internally whether to appear, so only one is ever visible.

## Out of scope
- No changes to onboarding flow, paywall logic, or which flags get written elsewhere.
- No copy/design changes to the hero or other sections.
- No backend or analytics changes.

## Files touched
- `src/components/TrialBanner.tsx` — tighten trigger condition (remove `trial_intent`).
- `src/components/OfferBanner.tsx` — new file.
- `src/App.tsx` (or wherever `TrialBanner` mounts) — add `<OfferBanner />`.
