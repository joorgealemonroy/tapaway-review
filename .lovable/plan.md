## Rep trial: keep "5 days" copy, set Stripe trial to 7 days

Pitch stays "5-day free trial" everywhere rep-facing. Stripe grants a 7-day trial so customers reliably get the full 5 days after card/fulfillment buffer.

### Edits

1. **`supabase/functions/create-rep-checkout/index.ts`** — set `trialDays: 7` on all four plans (`solo_monthly`, `solo_annual`, `venue_monthly`, `venue_annual`).
2. **`supabase/functions/create-rep-onboarding/index.ts`** — set `trialDays: 7` on the `solo` and `venue` entries in `PLAN_CONFIG`.

### Unchanged (intentional)
- `RepDocs.tsx`, `RepResources.tsx`, `RepDemoCreate.tsx` — all "5 days" / "5-day free trial" copy stays as-is.
- Customer-facing personal/business paywalls untouched.
- No DB or Stripe product changes; new sessions pick up `trial_period_days: 7` automatically.