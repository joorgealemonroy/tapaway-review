# Concierge Onboarding Refactor

Three coordinated changes to fully commit to the "Done-For-You" model: capture a phone number for the sales team, stop auto-generating profiles in the background, and route paid users to a VIP success page instead of straight into the dashboard.

---

## 1. Add Phone Number to the Final Onboarding Step

File: `src/pages/Onboarding.tsx` (the `step === "info"` block, the headline currently reads "Let's brand your cards").

- Add new state: `const [ownerPhone, setOwnerPhone] = useState("")`.
- Update subtitle copy under the headline to:
  > "Tell us about your business. We'll design your cards and build your digital profile for you."
- Insert a new required field directly **below** the Google Business search (and above the Logo upload):
  - `<Label>` "Phone Number"
  - `<Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567">`
  - Helper text: "We'll text you to confirm details and finalize your design."
  - Same dark/blue input styling as the surrounding fields.
- Add validation: in `handleOAuth`, `handleEmailSignup`, and `handleRepCheckout`, require a non-empty phone (basic length check ≥ 7 digits). Toast an error and abort if missing.
- Persist the phone to onboarding state:
  - Extend `OnboardingData` in `src/lib/onboardingData.ts` (the `phone` field already exists in the interface — confirm and reuse it).
  - Call `saveOnboardingData({ phone: ownerPhone.trim(), ... })` in all three submit handlers.
  - Restore `ownerPhone` from `getOnboardingData()` on mount.
- Save phone to the database in the post-auth `completeSetup` effect:
  - Include `phone: savedData.phone || ownerPhone || null` in both the `restaurants` insert and update payloads (the `restaurants.phone` column already exists).

---

## 2. Disable the Smart Auto-Builder

The auto-builder is the `magic-onboarding` edge function call inside `completeSetup` in `src/pages/Onboarding.tsx` (around lines 578–604, gated by `resolvedDashboardType === 'personal' || plan === 'solo'`).

- **Remove** the entire `magic-onboarding` invocation block, the `setShowMagicLoading(true)` call, and the `MagicLoadingOverlay` rendering branch in the loading return.
- Also remove the `auto-yelp-from-place` invocation just above it (line ~576) — same concierge rationale.
- Remove the now-unused imports/state: `showMagicLoading`, `setShowMagicLoading`, and the `MagicLoadingOverlay` import.
- Leave `finalize-onboarding` calls alone — those just mark records as ready, they do not scrape or generate content.
- Net effect: after checkout, the `restaurants` row will contain only auth email, phone, business name + address + Google place id, and logo url. The `personal_profiles` row (created via existing trigger/finalize path) will be left blank for the design team to populate.

The `magic-onboarding` edge function itself stays deployed (no deletion) in case it's reused later, but it is no longer called from the client.

---

## 3. New `/onboarding-success` VIP Screen

Create `src/pages/OnboardingSuccess.tsx`:

- Dark theme matching `Onboarding.tsx`: `bg-[#0a0e1a]`, white text, blue accents.
- Hidden navigation (no header / no footer / no `LandingNav`). Just a small centered "TapAway" wordmark at the top.
- Centered card layout, max-width ~md, framer-motion fade-in.
- Headline: **"🎉 You're on the VIP List!"**
- Body: "Sit tight! Our design team is reviewing your logo and building your custom TapAway profile right now."
- Numbered "What happens next" list (blue circular numerals matching the brand):
  1. We'll send you a text shortly to say hello and get any final details.
  2. We'll build a stunning, high-converting digital profile for you.
  3. Once you give us the thumbs up, we print and ship your NFC cards!
- Reassurance line: "No action needed from you today."
- Subtle ghost button at the very bottom: "Go to Dashboard →" linking to `/dashboard` (low contrast `text-gray-500 hover:text-gray-300`).

Routing — `src/App.tsx`:
- Add `const OnboardingSuccess = lazy(() => import("./pages/OnboardingSuccess"))`.
- Add `<Route path="/onboarding-success" element={<OnboardingSuccess />} />`.

Redirect logic in `src/pages/Onboarding.tsx`:
- Replace **every** post-checkout success destination with `navigate("/onboarding-success")`. Specifically:
  - The Stripe-return branch (currently `setShowSuccess(true)` after `verify-checkout` succeeds, ~line 195) — also remove the special-case redirect to `/dashboard?type=lite&welcome=true` for personal users; everyone goes to `/onboarding-success`.
  - The free-promo branch (~line 623).
  - The admin/test bypass branch (~line 650).
- The inline `showSuccess` JSX block (lines 712–728) and related `showSuccess` state can be removed.
- Rep flow (`/rep-checkout-success`) is unchanged — that's a separate flow for sales reps closing on behalf of clients.

---

## Technical Notes

- `restaurants.phone` column already exists; no migration required.
- `OnboardingData.phone` field already exists in `src/lib/onboardingData.ts`; just wire it through.
- `magic-onboarding` and `auto-yelp-from-place` edge functions remain deployed but become orphaned (callable only from admin tools / future flows).
- No changes to Stripe checkout, the `verify-checkout` function, or `finalize-onboarding`.
- No changes to authentication flows.
