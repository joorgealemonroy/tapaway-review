

# Update Stripe Payment Links for Personal Plans

## What changes

Update the monthly payment link in `src/lib/personalConfig.ts`. The yearly link is already correct.

### File: `src/lib/personalConfig.ts`

- **Monthly link**: Change from `https://buy.stripe.com/4gMeVddSnbXR0Tngv8gYU0d` to `https://buy.stripe.com/14A5kDbKfe5Z9pT7YCgYU0e`
- **Yearly link**: Already set to `https://buy.stripe.com/5kQaEX4hNbXR9pT5QugYU0c` -- no change needed

Both links include a 7-day free trial as configured in Stripe.

