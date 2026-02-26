

# Fix: VIP Card Users Hitting Paywall When Copying Pro Layouts

## Problem
When a VIP card user copies a Pro hub layout during signup, they reach the CheckoutStep which shows a full plan selector (Free / Monthly / Yearly). The copied layout has Pro features (custom header image, >5 links), and the toast says "Requires Pro — 7-day free trial included", nudging the user to select a paid plan. If they select Monthly or Yearly, the flow calls `handleStripeCheckout()` which redirects to Stripe — a paywall that VIP users should never see.

The root cause is two-fold:
1. `PersonalSignup.tsx` does NOT set `planLocked = true` for card-activation users, so the full plan selector is shown in CheckoutStep
2. `CheckoutStep.tsx` does not detect VIP status in its plan selection UI — it shows Free/Monthly/Yearly options even for VIP users who should get Pro access for free

## Changes

### 1. `src/pages/personal/PersonalSignup.tsx`
- Set `planLocked = true` for all card-activation users (both standard and VIP) so the plan selector is not shown in CheckoutStep
- This prevents VIP users from accidentally selecting a paid plan

**Line ~114**: Update the card-activation effect to also lock the plan:
```typescript
useEffect(() => {
  if (fromCardActivation && !planLocked) {
    update({ planType: isVipCard ? "free" : "free", cardChoice: "none" });
    setPlanLocked(true);
  }
}, [fromCardActivation, planLocked, isVipCard, update]);
```

### 2. `src/components/personal/signup/CheckoutStep.tsx`
- Detect VIP card in the plan summary display: show "VIP Access — $0" instead of "Free Plan — $0"
- In `handleGetCard`, ensure VIP users always go through the free/direct path (never Stripe), even if `formData.planType` somehow gets set to a paid plan
- Update the "Total due today" and CTA text for VIP users

**In the plan summary section (~line 1310-1336)**: When VIP flag is detected, show a VIP-specific summary instead of "Free Plan — $0":
```
⭐ VIP Access — $0
Full Pro features included with your VIP card
```

**In `handleGetCard` (~line 770-782)**: Add VIP check at the top:
```typescript
const handleGetCard = () => {
  const isVipCard = sessionStorage.getItem("tapaway_card_vip") === "true";
  if (isVipCard || isFreePlan) {
    if (preAuthed) {
      createProfileDirectly();
    } else {
      sendOTP();
    }
  } else if (PERSONAL_PAYMENTS_ENABLED) {
    handleStripeCheckout();
  } else {
    sendOTP();
  }
};
```

### 3. `src/components/card/HubShowcase.tsx`
- Update the toast message for card-activation users: when `tapaway_card_vip` is set, say "Layout copied!" without the "Requires Pro — 7-day free trial" messaging, since VIP users already have Pro access

These changes ensure VIP card users can copy any Pro layout and complete signup without ever seeing a plan selector or Stripe checkout.

