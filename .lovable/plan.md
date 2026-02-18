

# Free Plan: Show Pro Features with Upgrade Prompts + $0 Checkout

## Overview

During signup, free plan users should see ALL Pro features (custom header, photo collage, email capture, etc.) available in the editor. When they try to USE a Pro-only feature, show an upgrade prompt offering a 7-day free trial. The checkout page for free accounts should show $0 owed.

## Changes

### 1. LinksStep -- Allow Pro features but gate with upgrade toast (`src/components/personal/signup/LinksStep.tsx`)

- During signup, do NOT hide Pro-only features (custom header image, etc.) based on plan type
- All features are already visible in the current code since plan limits aren't enforced in the signup flow
- The HeaderCustomizer and blocks are already shown -- no changes needed here since there's no gating in place

### 2. Pro Feature Gating in Signup Flow

Since `isFeatureAvailable` from `personalPlanLimits.ts` is not currently used anywhere in signup components, all features are already accessible during signup regardless of plan. The gating needs to happen when a free user tries to use a Pro-only feature during signup:

- In `LinksStep.tsx`: When a free plan user tries to use the "Custom Image" header option or adds more than 5 links, show a dialog/toast: "This is a Pro feature. Try Pro free for 7 days!" with an "Upgrade" button that changes their plan selection to yearly
- Add a helper function `checkProFeature(featureName)` that checks `formData.planType === 'free'` and shows the upgrade prompt
- The upgrade prompt should have two options: "Try Pro Free for 7 Days" (switches plan to yearly) and "Maybe later" (dismisses)

### 3. CheckoutStep -- Free plan shows $0 (`src/components/personal/signup/CheckoutStep.tsx`)

**Plan summary (planLocked):**
- Free plan: show "Free Plan -- $0"
- Yearly: change from `Pro Annual -- $75/year` to `Pro Annual -- $6.25/month` with "Billed annually $75" subtext
- Monthly: keep as-is

**Plan selection (not locked):**
- Yearly option: change `Pro -- $75/year` to `Pro -- $6.25/month` with "Billed annually $75" subtext
- Monthly: keep as-is
- Free: already shows "$0"

**Order summary:**
- Free plan: show "Free plan" with "$0" and "Total due today: $0"
- Yearly plan: show "$6.25/mo" line item with "Billed annually $75" note, total "$75"
- Monthly plan: keep as-is

**CTA button for free plan:**
- Already says "Create Free Account" -- keep this

### 4. PreviewStep -- No changes needed
The preview step already works for all plan types.

## Technical Details

### Upgrade prompt component (inline in LinksStep)
```text
Dialog or toast that appears when free user taps a Pro feature:
- Title: "This is a Pro feature"
- Body: "Upgrade to Pro to unlock [feature name]. Try it free for 7 days."
- Primary CTA: "Try Pro Free for 7 Days" -> updates planType to "yearly"
- Secondary: "Maybe later" -> dismisses
```

### CheckoutStep pricing display changes
Lines 903-927 (planLocked summary): Update yearly display to "$6.25/month" + "Billed annually $75"
Lines 932-958 (yearly selection): Update to "$6.25/month" + "Billed annually $75"  
Lines 1029-1048 (order summary): Update yearly to show "$6.25/mo" with annual note, free shows "$0"

### Files to modify
1. `src/components/personal/signup/LinksStep.tsx` -- Add Pro feature upgrade prompt dialog
2. `src/components/personal/signup/CheckoutStep.tsx` -- Update pricing display for yearly (monthly equivalent) and ensure free shows $0 throughout

