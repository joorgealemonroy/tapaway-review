

# Fix: NFC Card Not Claimed After Signup

## The Problem
When `adrianlasislas` activated card `9NNB3N`, the signup flow created a profile successfully but **never called `claim-card`** to link the NFC card to the new profile. The card remains `unclaimed` in the database with no `owner_user_id`.

This means tapping the card again won't redirect to the user's profile — it shows the activation flow again.

## Database Evidence
- Card `9NNB3N`: status = `unclaimed`, owner_user_id = null, card_type = `vip`
- Profile `adrianlasislas`: exists, plan_type = `vip`, subscription_status = `active`

## Root Cause
`CardResolver.tsx` only calls `claim-card` if the user **already has a profile**. If they don't, it sends them to the signup flow. But neither `verifyOTPAndCreateAccount` nor `createProfileDirectly` in `CheckoutStep.tsx` ever calls `claim-card` after creating the profile.

## Fix

### 1. `src/pages/personal/PersonalSignup.tsx`
- Extract the `card` search param from the URL
- Pass it to `CheckoutStep` as a new `cardCode` prop

### 2. `src/components/personal/signup/CheckoutStep.tsx`
- Add `cardCode?: string` to the Props interface
- After profile creation succeeds in **both** paths (`verifyOTPAndCreateAccount` at ~line 568 and `createProfileDirectly` at ~line 744), call `claim-card` if `cardCode` exists:

```typescript
if (cardCode) {
  try {
    await supabase.functions.invoke("claim-card", {
      body: { public_code: cardCode },
    });
    logCheckpoint("Card claimed", { cardCode });
  } catch (claimErr) {
    console.warn("Card claim failed (non-fatal):", claimErr);
  }
}
```

### 3. Manual fix for `adrianlasislas`
- Run a database update to claim card `9NNB3N` for the existing user, linking it to their profile

## Files Modified
- `src/pages/personal/PersonalSignup.tsx` — pass `cardCode` prop
- `src/components/personal/signup/CheckoutStep.tsx` — accept prop, call `claim-card` after profile creation in both code paths

