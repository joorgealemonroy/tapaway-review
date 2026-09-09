# Support redesign, correct card allowances, and self-serve dashboard access

Note on allowance: your brief said Solo = 5, but your answer said Solo = 4. This plan uses **Solo = 4, Venue = 15**. Say the word if it should be 5.

## 1. New /support page

**Signed out**
- "Already a TapAway customer?" panel — "Your dashboard is where you manage your hub, cards, and billing." with a Sign in button going to `/auth` and back to `/support`. No sign-up push.
- "Don't know how to reach your dashboard? We'll email you a secure link." — email field, one button.
- "General question or feedback" form: name, email, message. Public, unchanged behaviour.

**Signed in — personalized help hub**
- Header line with their plan, allowance, and status, e.g. "Solo · 4 cards per month · Active", plus cards already used this month.
- "Get more cards" — dialog with quantity (capped at what's left this month), confirm shipping address, submit. Uses the existing card-request flow.
- "Something's not working" — issue chips (link wrong, QR not scanning, NFC not working, hub page broken, other) plus one description box, one screen.
- "Billing question" — button to the dashboard Plan tab, plus an optional message box.
- "General question or feedback" stays.
- Nothing asks for name, business, or email — all prefilled from the account.

The five-button flow (new cards / more cards / tech issue / billing / other) and its manual info screens are removed for signed-in users. Success states and the tap@tapaway.co fallback stay. Mobile-first single-column layout.

## 2. Correct card allowances

Policy: Solo → 4 per month, Venue → 15 per month. Requesting cards requires an active or trialing subscription.

- `src/pages/Support.tsx` — the "10 per month per location" copy and the max-10 input go away with the redesign.
- `src/components/dashboard/RequestMoreCards.tsx` — replace the fixed 10 with the plan-based allowance, cap the input at what's left this month, and when the subscription isn't active or trialing show a friendly note pointing to the Plan tab instead of the form.
- `supabase/functions/request-more-cards/index.ts` — same allowance enforced on the server from the account's own plan record, never from the number the browser sends; clear rejection when the subscription isn't active or trialing.

Plan mapping: `venue`, `venue_pack`, `venue_yearly`, `bundle`, `yearly_200` → 15. Everything else (`solo_pro`, `founding_pro`, `vip`, `monthly`, `plus_monthly`) → 4.

The card-request function currently only handles restaurant accounts; it will be extended so solo accounts can request their cards too, with the same monthly counting and shipping-address reuse.

## 3. "Your hub is ready" email

Add a short three-line "Your dashboard" section to the `hub_ready` template:
- Manage your hub, order cards, and handle billing from your dashboard.
- Sign in at tapaway.co/auth with the email you signed up with.
- First time? Use "Forgot password" to set a password — we'll email a 6-digit code.

## 4. Self-serve dashboard access

Entry points: an option on `/auth` ("First time signing in? Get dashboard access") and the same on the signed-out `/support` view.

Flow: enter the signup email, tap "Send me access", always see "Check your inbox — we sent you a secure link" whether or not an account exists. The email uses the existing password-setup styling with subject "Access your TapAway dashboard — set your password". The link opens a new `/auth/set-password` page that shows a password field with the existing strength checklist, sets the password, signs them in, and lands on the dashboard.

The existing van-handoff setup email and the forgot-password code flow are untouched.

## Technical notes

- New shared helper for plan → monthly card allowance, used by the dashboard component, the support hub, and the edge function.
- Monthly usage keeps counting `fulfillment_orders` rows with `plan = 'addon'` since the start of the calendar month; the function gains a `personal_profile_id` path alongside `restaurant_id`.
- Support submissions keep writing to `support_requests` and calling `support-notification` (internal + customer confirmation emails).
- New `request-dashboard-access` edge function: rate limited to 3 per hour per IP via the shared limiter, looks up the auth user with the admin client, returns success regardless, generates a recovery link with `redirectTo` `https://tapaway.co/auth/set-password`, sends via Resend, logs to `email_sends`.
- New route `/auth/set-password` added to the router and to the public-route list; it exchanges the recovery token for a session before showing the form.
- No pricing, plan, or trial logic changes.

## Verification

- Signed out: general question submits, both emails arrive; access-link request shows the same message for a real and a nonexistent email, with an email sent only for the real one.
- Signed in Solo: hub shows "Solo · 4 cards per month", dialog caps at 4, issue form submits with no name/email prompts.
- Signed in Venue: hub shows "Venue · 15 cards per month", dialog caps at 15.
- Server rejects a 5th Solo card in the same month and rejects a canceled subscription.
- Access link sets a password and lands signed in on the dashboard.
