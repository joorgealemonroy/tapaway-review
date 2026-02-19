

# Skip Physical Card Step for Card Activators and Streamline Free Plan Selection

## What Changes

### 1. Skip Step 3 ("Get a physical card") for card-activation users

Users arriving from `/c/CODE` already have a physical card. Showing them the card selection step is redundant.

**File: `src/pages/personal/PersonalSignup.tsx`**
- Detect card-activation users via the `card` search param or the `tapaway_card_preauthed` sessionStorage flag
- Store this in a `fromCardActivation` state
- When `fromCardActivation` is true:
  - Change the step sequence from [1, 2, 3, 4] to [1, 2, 3] (skip the physical card step)
  - Map internal steps so step 3 renders the Checkout instead of PreviewStep
  - Update the progress dots from 4 to 3
  - Auto-set `cardChoice: "none"` since they already have a card
  - Update `stepTitles` to exclude "Get a physical card"

### 2. Auto-select Free plan when no Pro features are used

**File: `src/pages/personal/PersonalSignup.tsx`**
- If the user hasn't explicitly chosen a plan via URL param (`planLocked` is false) and `fromCardActivation` is true, default `planType` to `"free"`

### 3. Update username "tap" prefix messaging to reference free trial

**File: `src/components/personal/signup/IdentityStep.tsx`**
- Change the upgrade link text from:
  > "Upgrade to Pro to remove the 'tap' prefix"
- To:
  > "Start a free trial to remove the 'tap' prefix"
- Update the toast message from:
  > "Switched to Pro plan -- complete checkout to remove the 'tap' prefix."
- To:
  > "Free trial selected -- you can try Pro free for 7 days to remove the 'tap' prefix."

## Technical Details

### PersonalSignup.tsx step logic

```
const fromCardActivation = !!searchParams.get("card") || sessionStorage.getItem("tapaway_card_preauthed") === "true";

const totalSteps = fromCardActivation ? 3 : 4;

// Step mapping for card-activation users:
// Visual step 1 -> IdentityStep
// Visual step 2 -> LinksStep  
// Visual step 3 -> CheckoutStep (skip PreviewStep entirely)

const stepTitles = fromCardActivation
  ? { 1: "Create your TapAway", 2: "Build your profile", 3: "Finish your order" }
  : { 1: "Create your TapAway", 2: "Build your profile", 3: "Get a physical card", 4: "Finish your order" };
```

The `nextStep` and `prevStep` functions will use `totalSteps` instead of hardcoded `4`. The rendering logic will conditionally show CheckoutStep at step 3 when `fromCardActivation` is true.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/personal/PersonalSignup.tsx` | Detect card-activation, skip physical card step, adjust progress dots and step mapping, auto-select free plan |
| `src/components/personal/signup/IdentityStep.tsx` | Change "Upgrade to Pro" text to "Start a free trial" language |

