# Global Pricing Sweep — $20 / $25 / $199

New structure: Base $20/mo · Card Club +$5/mo ($25/mo bundle) · Annual Value Pass $199/yr (Card Club included, saves $101).

## 1. Source of truth

`src/lib/constants.ts` currently still holds the old numbers (base 15, bundle 20, annual 180). Update the `PRICING` object and its header comment to 20 / 5 / 25 / 199, keeping the existing key names (`base`, `cardClub`, `bundle`, `annual`) and shape so nothing breaks.

`src/lib/personalConfig.ts` also has a separate `PERSONAL_PRICING` map (`monthly: 15`, `yearly: 75`). Align it to `monthly: 20`, `yearly: 199` so the personal signup/checkout and admin plan selectors show the same numbers.

## 2. Claim page

`src/pages/ClaimHubPage.tsx` already reads `PRICING.*` for the three plan cards, so those update automatically. One hardcoded string remains (the meta/description "…active — $15/month.") which becomes `$20/month`. Keep the bundle ($25/mo) as the preselected option unless you'd prefer the annual pass by default.

## 3. Front-end copy sweep

Replace old prices with the new ones (using `PRICING.*` where a component can import it):

- `src/components/personal/PersonalBillingTab.tsx` — $180/yr → $199/yr, $20/mo bundle → $25/mo, $15/mo → $20/mo (3 places).
- `src/components/personal/ProUpgradeDialog.tsx` — "$15/month" → "$20/month".
- `src/components/personal/AdvancedAnalyticsTab.tsx` — "Upgrade to Pro — $15/month" → $20/month.
- `src/components/landing/FAQSection.tsx` — trial answer → "$20/month (add the $5/mo Card Club any time)".
- `src/components/landing/NewHero.tsx` — "$15/month · or $180/year" → "$20/month · or $199/year".
- `src/pages/Paywall.tsx` — "After the trial: $15/month" → $20/month.
- `src/lib/personalPlanLimits.ts` — plan `price: '$15'` → `'$20'`.

## 4. Rep tools and scripts

- `src/pages/rep/RepClose.tsx` — plan option prices: Annual $180/yr → $199/yr, Bundle $20/mo → $25/mo, Base $15/mo → $20/mo (commission amounts unchanged).
- `src/pages/rep/RepDocs.tsx` — follow-up script and FAQ pricing lines.
- `src/components/rep/PitchScriptDialog.tsx` — pitch script pricing.
- Rep "Send Claim Link" message copy updated to lead with the $199 annual pass ($101 savings) or $20/mo.

## 5. Edge functions

- `supabase/functions/create-claim-checkout/index.ts` — amounts `1500` → `2000` for base, annual `18000` → `19900`, plus the header comment. Card Club add-on stays `500`.
- `supabase/functions/create-rep-checkout/index.ts` — tier `priceAmount`s: 1500 → 2000, 2000 → 2500, 18000 → 19900, with comments corrected.
- `supabase/functions/create-personal-upgrade/index.ts` and `create-personal-checkout/index.ts` — these use hardcoded Stripe price IDs whose comments claim $15/$9/$99. Since those IDs point at existing Stripe prices we cannot re-price from code, switch them to the same find-or-create-price pattern already used by the claim/rep checkouts at 2000/month and 19900/year, so all paths bill the new amounts consistently.
- `stripe-webhook` — verify plan/amount mapping still resolves for the new amounts and no old-amount branch exists.

Note: there is no `send-trial-expiration-reminders` function in the project, so no SMS/email template exists there today. If trial-reminder messaging is wanted, that's a separate build — say the word and I'll add it to the plan.

## 6. Verification

- Typecheck clean.
- Grep for `$15`, `$180`, `$99`, `1500`, `18000` to confirm no stale customer-facing price remains.
- Load `/claim` and the billing tab to confirm the new numbers render.
