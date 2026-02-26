

# Fix: VIP Card Users See "tap" Prefix on Username

## Problem
When a VIP card user goes through signup, the username field shows `tapaway.co/tapjorge` instead of `tapaway.co/jorge`. This happens because VIP card activation sets `planType: "free"` in the onboarding data, and the IdentityStep uses `selectedPlan === "free"` to decide whether to show the "tap" prefix.

The profile creation code in CheckoutStep correctly detects VIP via sessionStorage and passes `"vip"` to `getPublicUsername()`, but the IdentityStep UI and username availability check both rely on `selectedPlan` which is `"free"`.

## Root Cause
In `PersonalSignup.tsx` line 114:
```typescript
update({ planType: isVipCard ? "free" : "free" });
```
VIP cards should set `planType: "vip"` so the entire flow knows not to add the "tap" prefix.

## Changes

### 1. `src/pages/personal/PersonalSignup.tsx`
- Change the card-activation effect to set `planType: "vip"` when `isVipCard` is true:
```typescript
update({ planType: isVipCard ? "vip" : "free", cardChoice: "none" });
```

### 2. `src/components/personal/signup/IdentityStep.tsx`
- Update the `selectedPlan` prop type to include `"vip"`
- Update line 83: username check should NOT add "tap" prefix for VIP users
- Update line 217: username display should NOT show "tap" for VIP users

Both lines currently check `selectedPlan === "free"`. Change to: the "tap" prefix is only added when `selectedPlan === "free"` (VIP is no longer "free", so this works automatically once planType is set correctly).

### 3. `src/components/personal/signup/CheckoutStep.tsx`
- The `createProfileDirectly` and OTP flows already detect VIP via sessionStorage and pass `"vip"` to `getPublicUsername()` — no changes needed here. However, the `effectivePlanType` logic can be simplified since `formData.planType` will now already be `"vip"` for VIP users.

These changes ensure the username prefix, availability check, and final profile creation all consistently treat VIP users as non-free (no "tap" prefix).

