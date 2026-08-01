## Goal

Make `tap@tapaway.co` the only contact address shown anywhere in the app. A code search found `support@tapaway.co` in 8 places across 7 files; nothing else user-facing uses another address.

## Changes (copy-only, no logic)

Replace `support@tapaway.co` with `tap@tapaway.co` in both the `mailto:` href and the visible label:

1. `src/pages/Terms.tsx` — line 57 (intro contact), line 654 (Section 32 demo takedown notice), line 683 (Section 33 marketing-license opt-out). Section 34 already uses `tap@tapaway.co`, so the page becomes consistent.
2. `src/pages/personal/PersonalProfilePage.tsx` — line ~1663, the unclaimed demo hub takedown footer.
3. `src/pages/Compliance.tsx` — line 41 compliance contact, and line 90 sample "HELP reply" SMS body text.
4. `src/pages/SmsSignup.tsx` — line 240 help contact.
5. `src/pages/RepCheckoutSuccess.tsx` — lines 44–45 support link.
6. `src/pages/OnboardingNew.tsx` — line 529 support mailto.

## Left alone (per your answer)

- Outbound sender identities in edge functions (`no-reply@`, `notifications@`, `hello@`, `cards@`) stay as-is — they are Resend "from" addresses, not inboxes, and changing them risks send failures if `tap@tapaway.co` isn't verified as a sender.
- `alexis@tapaway.co` in `src/lib/grandfatheredUsers.ts` and the `test-*@tapaway.co` entries in test-account fixtures — these are account identifiers, not contact addresses.

## Verification

- Full typecheck.
- Grep to confirm zero `support@tapaway.co` occurrences remain in `src/`.
- Playwright pass over `/terms`, `/compliance`, `/sms-signup` and one demo hub to confirm the visible address reads `tap@tapaway.co`.
