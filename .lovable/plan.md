

# Remove "Get a Physical Card" Step from Signup

## What's Changing
The PreviewStep (step 3 — "Get a physical card") is being removed from the standard signup flow, reducing it from 4 steps to 3 for all users. The flow becomes: (1) Identity, (2) Build profile, (3) Checkout.

## Changes in `src/pages/personal/PersonalSignup.tsx`

1. **Remove PreviewStep import** — delete the import of `PreviewStep`
2. **Set `totalSteps` to 3** — remove the conditional; it's always 3 now
3. **Remove `fromCardActivation` / `isVipCard` conditional logic around totalSteps** (keep the card-activation plan defaults)
4. **Update step URL restore** — cap at 3 instead of 4
5. **Update `stepTitles`** — remove step 3 "Get a physical card", rename step 3 to "Finish your order"
6. **Remove the PreviewStep render block** (the `currentStep === 3 && !fromCardActivation` block)
7. **Simplify CheckoutStep render** — always render on `currentStep === 3`
8. **Update progress dots** — already derived from `totalSteps`, so automatic
9. **Default `cardChoice` to `"none"`** for all users since the card selection UI is removed

