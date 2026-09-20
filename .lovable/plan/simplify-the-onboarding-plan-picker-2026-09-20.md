# Simplify the onboarding plan picker

## Goal
Make the first onboarding decision immediately understandable as “4 cards or 15 cards,” while matching TapAway’s dark landing-page design and preserving the working pricing, checkout, attribution, analytics, and saved-selection behavior.

## Plan

### 1. Match the landing page
- Replace the ivory and forest-green treatment with the landing page’s existing dark background, white headings, teal primary action, typography, borders, radii, and lighter dark option surfaces.
- Keep the existing TapAway navigation and help link, with accessible contrast and visible keyboard focus states.
- Remove the onboarding-only ivory/green styling from this screen where it is no longer used.

### 2. Make quantity the primary decision
- Use the headline “How many cards do you need?” and supporting copy “We’ll design your cards, set up your business hub, and ship them to you.”
- Remove “Made for your business,” the repeated “Choose your plan” heading, public Solo/Pro names, audience descriptions, eligibility language, and extra explanations.
- Present two full selectable options headed “4 cards” and “15 cards,” each with “Custom printed with your logo.”
- Retain `solo` and `venue` internally and preserve all existing plan entitlements.
- Use the existing card artwork at consistent physical proportions, with quantity and selection state more prominent than decoration.

### 3. Keep billing clear and accurate
- Preserve the configurable default, explicit URL choice, remembered selection, and Yearly/Monthly toggle behavior.
- Keep yearly visually featured without obscuring monthly.
- Show connected prices only: 4 cards at $20/month or $199/year; 15 cards at $39/month or $390/year.
- For yearly, show the monthly equivalent, full annual charge, and calculated savings of $41 or $78 together.
- Preserve the current generic yearly-unavailable fallback and one-tap switch to monthly.
- Keep “14 days free · $0 due today” compact and do not imply the trial has started on page view.

### 4. Show shared value once
- Replace the repeated/expanded benefit treatment with exactly three compact benefits below the choices:
  - Custom business hub
  - Done-for-you setup
  - Free US shipping
- Do not repeat benefits inside either quantity option.

### 5. Make the next action unmistakable
- Place one primary action immediately after the options and shared benefits: “Continue with 4 cards” or “Continue with 15 cards.”
- Keep it sticky on mobile with safe-area spacing and reserve enough page space so it never covers pricing, benefits, or disclosures.
- On desktop, keep the action in the natural reading flow rather than detached at the bottom of the viewport.

### 6. Simplify disclosures without weakening them
- Replace the dense plan-screen paragraph with selection-aware wording. For 4 cards billed yearly:
  - “14 days free, then $199/year. Renews yearly until canceled.”
  - “Cancel before your trial ends to avoid the first subscription charge.”
- Generate equivalent truthful wording for monthly billing and the 15-card option.
- Show annual cancellation/current-term refund wording only when Yearly is selected.
- Keep Terms and Refund Policy as separate understated links.
- Preserve the verified temporary $1 hold explanation on the business/payment handoff screen immediately before checkout; do not describe the trial as active before verification.

### 7. Verify the focused refinement
- Check 360px, 390px, and desktop widths for contrast, overflow, sticky-action clearance, proportional artwork, and at-a-glance comprehension.
- Test both quantities and both billing cycles, including annual savings, annual totals, monthly prices, remembered selections, configurable default, back navigation, and yearly-unavailable fallback.
- Confirm Continue still passes the existing internal plan and billing interval into the unchanged business-details and checkout flow.
- Confirm attribution, analytics events, trial confirmation, paid-conversion reporting, and subscription behavior remain unchanged.
- Check for TypeScript, lint, runtime, and browser-console errors.

## Guardrails
- Presentation and copy refinement only; no pricing, product, price ID, trial, checkout, subscription, attribution, or analytics logic changes.
- No new Stripe products or prices.
- No changes to internal `solo`/`venue` identifiers or entitlements.
- Do not move the $1 hold disclosure onto the plan picker; keep it beside payment collection before card entry.
