
## Goal

Reframe the post-Stripe checkout return as a premium "done-for-you" concierge moment. Scope is intentionally minimal: rewrite one file, touch nothing else.

## Single file to change

`src/pages/OnboardingSuccess.tsx` (full rewrite; route `/onboarding-success` already wired in `App.tsx`).

### Layout

- Reuse the existing dark shell: `#0a0e1a` page bg, `#111827` card, TapAway wordmark at top, `max-w-md` centered card — matches the current success page and the rest of onboarding.
- Fire `ConfettiEffect` from `src/components/personal/ConfettiEffect.tsx` once on mount (mount unconditionally, unmount itself via its `onComplete`).

### Content

- Small VIP-style pill at top of card: "✦ Concierge Build".
- **Headline (h1)**: "You're in! Let our design team take it from here."
- **Subheadline**: "We are manually building your custom digital profile so it looks perfect. We'll text you shortly to review your design before we program and ship your physical cards."
- **Next steps checklist** — 3 items, `CheckCircle2` icon (lucide) in cyan/blue-400 for each, staggered `motion.div` fade-in (`delay: 0.2 + i * 0.12`):
  1. We build your profile.
  2. You approve the design via text.
  3. Your NFC cards ship.
- **Primary button** — full-width, primary blue, label "Go to Dashboard". `onClick` → `navigate("/dashboard")`. This is the existing app route that already dispatches users to the personal dashboard view via `Dashboard.tsx` → `PersonalDashboard`; no routing changes needed here.

### Behavior

- `useEffect` scrolls to top on mount.
- No data fetching, no auth checks, no side-effects beyond confetti + navigation. Safe to render for any post-Stripe return.

## Explicitly out of scope

- No SQL migrations, no `setup_status` column, no schema changes of any kind.
- No edits to `src/pages/Dashboard.tsx`, `PersonalDashboard.tsx`, or any business-branch routing.
- No new tracker component, no "Missing Assets" module, no gated dashboard state.
- No changes to `App.tsx` (route already exists).
- No changes to Stripe redirect targets or edge functions.

## Files touched

- `src/pages/OnboardingSuccess.tsx` — full rewrite (only file changed).
