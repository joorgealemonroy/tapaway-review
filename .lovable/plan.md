# Rename plans to TapAway Solo and TapAway Pro

## Customer-facing updates
- Update the onboarding plan cards to **TapAway Solo** and **TapAway Pro**.
- Change the Solo included-card count from 3 to 4. Keep Venue at 15.
- Add these two checked benefits beneath the included-cards line for both plans:
  - Custom hub designed & built for you.
  - Backed by the 14-Day Love-It Promise.
- Keep the shared plan-card rendering so the copy appears identically in Monthly and Yearly views.
- Update dashboard billing labels and account-status labels to the new names, including monthly/yearly wording.
- Update the admin compensation group labels and the active admin approval toast for naming consistency.

## Checkout and product display names
- Update product display names in:
  - `create-checkout-session`
  - `create-rep-onboarding`
  - `create-admin-coupon`
- Also update the audited active checkout helpers that can surface the old or inconsistent names:
  - `create-claim-checkout` and the shared personal Stripe pricing helper: annual Solo becomes **TapAway Solo**.
  - `create-rep-checkout`: Solo becomes **TapAway Solo** and Venue becomes **TapAway Pro**.
- Preserve every existing product lookup metadata key and value, including `solo`, `venue`, `annual_value_pass`, `base_software`, and rep `plan_key` values.
- Do not alter prices, price IDs, billing intervals, trial periods, discounts, checkout behavior, or plan identifiers.
- Do not add product-update code and do not create products or prices as part of verification.

## Scope guardrails
- Treat the existing Card Club “3 cards/month” and one-time 3-card order copy as separate products, not the Solo included-card count; leave those unchanged.
- Leave internal database values such as `solo_pro` and all internal branching logic unchanged.
- Update harmless comments only where they would otherwise incorrectly document a renamed product.

## Deployment and verification
- Run the project checks and a repository-wide search for `Solo Pro`, `Venue Pack`, `3 Smart Cards`, and the retired Stripe product names.
- Report every remaining match and classify it as intentional internal/history/commentary or an unresolved customer-facing string; no customer-facing old names should remain.
- Deploy every changed checkout function with zero deployment errors.
- Verify the onboarding plan selector on phone and desktop in both Monthly and Yearly modes: new names, Solo 4-card inclusion, and both new benefit lines.
- Generate the four checkout pages—Solo monthly/yearly and Pro monthly/yearly—and confirm their amounts, intervals, and trial terms remain unchanged.
- Confirm no checkout test creates or completes a charge.

## Manual Stripe step and verification boundary
- Existing Stripe products are returned by metadata before code uses a fallback creation name, so code deployment alone will not rename those existing products.
- After deployment, rename the existing Stripe products in Stripe to **TapAway Solo** and **TapAway Pro** without creating products or prices.
- Per the selected verification scope, verify checkout pages only. Invoice and receipt naming will depend on that manual product rename and will not be tested with real payments in this pass.
