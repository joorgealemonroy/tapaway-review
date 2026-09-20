# TapAway plan-selection redesign

## Goal
Rebuild the first `/onboarding` screen to match the supplied warm-ivory reference, make yearly billing the configurable default, and carry the exact plan and billing cycle into the existing business-details and Stripe Checkout flow.

## Current-state findings
- “Send Me My Cards” routes through `/start` to the plan step in `/onboarding`.
- Current checkout pricing matches the requested offer: Solo is $20 monthly or $199 yearly; Pro is $39 monthly or $390 yearly. Both are configured for a 14-day Stripe trial.
- Calculated annual savings are $41 for Solo and $78 for Pro; monthly equivalents are $16.58 and $32.50.
- The checkout currently resolves Stripe products/prices by metadata and amount and can create a missing price. That conflicts with the requirement not to create replacement products or prices.
- Plan and billing selections are restored from saved onboarding data after they have been saved, but the first-step selection is not persisted immediately.
- The current flow inserts a separate Loss Protection upsell between plan selection and business details.
- Existing site analytics currently records page views/exits only. Confirmed paid invoices already drive server-side Meta Purchase tracking and exclude $0 invoices.

## Plan

### 1. Build the responsive plan picker
- Replace only the current plan-step presentation with a focused warm-ivory interface using near-black type, forest-green selection accents, thin borders, restrained radii, and existing TapAway card artwork at accurate physical proportions.
- Use the supplied headline, supporting copy, Solo/Pro descriptions, quantities, and the four shared benefits exactly as requested.
- Make each full plan panel selectable with a clear radio/check state and strong keyboard/focus behavior.
- Keep both plans compact and directly comparable at 360px, 390px, tablet, and desktop widths.
- Remove current “Most Popular,” extra feature promises, glowing styles, and unnecessary entrance animations from this step.

### 2. Make billing accurate and configurable
- Add the prominent Yearly/Monthly segmented control above the plans.
- Add a constrained `onboarding_default_billing` setting with a safe `year` default. Visitors may read it to initialize the picker, but only admins may update it under the existing role-checked settings policy.
- Selection precedence will be: explicit landing-page query selection, saved signup-session selection, then the configurable default.
- Persist plan and billing changes immediately without overwriting business details, so switching cycles and navigating back never clears entered information.
- Calculate equivalents and savings from the connected monthly and annual catalog values, not duplicated display strings.
- Show “Best value” only for an annual option whose verified annual total is below twelve monthly payments.

### 3. Map and cache the exact Stripe catalog
- Inspect the live Stripe catalog and map the exact four existing prices: Solo monthly, Solo yearly, Pro monthly, and Pro yearly. Prefer explicit price IDs; use unique Stripe lookup keys only where they are already present and unambiguous. Never select a price by amount plus loose metadata alone.
- Add a read-only plan-catalog response for the picker. On the server, verify every mapped price is active, belongs to the expected TapAway product, uses USD, has the expected recurring month/year interval, and matches the intended plan key.
- Cache the verified catalog server-side with a bounded TTL and cache the response in the client signup session, so opening the picker does not trigger a fresh Stripe search each time. Keep a retry path for transient failures.
- At checkout, resolve the submitted plan and cycle back to the server-owned mapping and re-fetch/revalidate that exact Stripe price before creating the session. Never trust a client-supplied amount or price identity.
- Remove find-or-create behavior from this onboarding checkout path. It will neither create nor replace Stripe products or prices.
- If a yearly mapping is missing or invalid, show only “Yearly is temporarily unavailable” and make the valid monthly option one-tap accessible. Send the plan, expected mapping, validation failure, and timestamp to protected admin logs without exposing configuration details to visitors.
- Preserve the existing internal plan keys, products, prices, trial duration, billing intervals, promo behavior, and checkout handlers.
- Validate during implementation that the connected catalog still returns Solo $20/$199 and Pro $39/$390; report any real mismatch rather than masking it in the UI.

### 4. Present trial and charge terms precisely
- For yearly selections, show the monthly equivalent, full annual amount billed after trial, and exact annual savings together in each panel and again in the sticky summary.
- For monthly selections, show the actual monthly charge and when it begins.
- Display “14 days free” and “$0 due today” only after the selected Stripe price and trial configuration are verified as supporting them.
- State that yearly cancellation stops renewal, without implying that an annual payment is refundable.
- Keep the existing card-verification disclosure and Stripe-hosted checkout behavior accurate.

### 5. Streamline the handoff
- Add a mobile sticky action area with selected plan, cycle, card quantity, due-today amount, next charge/frequency, and “Continue with Solo/Pro.”
- Reserve bottom space plus safe-area padding so the sticky area never covers plan content.
- Continue directly to the existing business-details step, bypassing the separate Loss Protection upsell for this customer path; no sales call, confirmation screen, or replacement upsell is added.
- Explicitly clear any stale saved Loss Protection selection when this new-signup flow starts or resumes, omit the add-on from saved state and checkout metadata, and enforce no Loss Protection line item server-side for this path.
- Carry the exact plan and billing interval through auth restoration, business creation, Stripe session metadata, cancel/back navigation, and checkout retry.
- Keep loading and catalog/checkout errors visible and retryable without clearing saved form information.

### 6. Preserve attribution and add funnel events
- Preserve UTM/campaign context through `/start`, onboarding, auth return, and Stripe metadata; keep Meta browser identifiers consent-gated and retain Trybe visitor handling.
- Extend the existing analytics allowlist/client with distinct events for plan view, billing-cycle change, Continue click, confirmed trial start, and successful paid conversion.
- Attach plan, cycle, catalog amount, experiment default, session ID, and consent-eligible visitor/campaign context.
- Record trial start only after Stripe confirms a live trial, and paid conversion only from a positive paid invoice. Continue clicks and $0 trial invoices will never emit Purchase.
- Keep the existing `invoice.paid` Meta Purchase emitter as the single Meta Purchase path. Do not add a second browser or verification-time Purchase emitter.
- Classify the first positive invoice after a trial as `new_customer_conversion` and later positive invoices as `renewal`, using Stripe billing reason/subscription history rather than timing guesses. Include that classification in acquisition reporting so renewals cannot inflate new-customer conversion counts.
- Use deterministic Stripe invoice event IDs plus existing unique-event safeguards to preserve deduplication across webhook retries.
- Keep existing server-side Meta Purchase behavior for positive invoices and do not weaken consent rules for browser tracking.

### 7. Verify the complete flow
- Test 360px, 390px, tablet, and desktop layouts, including sticky safe-area clearance and no horizontal overflow.
- Test both plans and both cycles, explicit landing-page selections, configurable default behavior, saved-session restoration, back navigation, and cycle switching after entering details.
- Verify resolved Stripe price IDs, displayed calculations, trial disclosures, checkout metadata, cancel/retry behavior, and the full business-details-to-checkout handoff.
- Verify catalog caching, checkout-time revalidation, generic visitor-facing catalog errors, protected admin diagnostics, and that stale Loss Protection state can never add a charge.
- Verify analytics separation and deduplication for views, cycle changes, Continue, confirmed trials, first paid conversions, and renewals.
- Run focused checks for TypeScript, lint/runtime warnings, browser console errors, and affected edge functions.

## Expected touched areas
- The `/onboarding` plan step and its saved onboarding state
- Semantic design tokens for the scoped ivory/forest plan-picker treatment
- Existing Stripe checkout/catalog resolution functions
- Existing analytics client, ingest allowlist, and Stripe webhook conversion recording
- Protected admin error logging for missing or invalid Stripe mappings
- One additive settings migration for the publicly readable, admin-writable billing default

## Guardrails
- No new Stripe products or prices.
- No changes to internal plan keys, amounts, trial length, or billing intervals.
- No fake reviews, popularity claims, delivery promises, emoji icons, glow effects, or unrelated page redesigns.
- No paid Purchase event for Continue clicks, trial starts, or $0 invoices.
- No Loss Protection line item for new signups through this redesigned flow, including resumed sessions with stale saved state.
- No customer-facing Stripe IDs, lookup keys, or configuration diagnostics.
