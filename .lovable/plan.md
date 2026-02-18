
# Fix Free Plan Bypassing Stripe + End-to-End Data Integrity

## Problem

Currently, `handleGetCard()` sends ALL users to Stripe checkout when `PERSONAL_PAYMENTS_ENABLED` is true -- including free plan users. Free users should never touch Stripe.

## Changes

### File: `src/components/personal/signup/CheckoutStep.tsx`

**1. Route free plans to OTP flow instead of Stripe**

Update `handleGetCard` (around line 459) to check the plan type:

```
const handleGetCard = () => {
  if (isFreePlan) {
    // Free plan never goes through Stripe
    sendOTP();
  } else if (PERSONAL_PAYMENTS_ENABLED) {
    handleStripeCheckout();
  } else {
    sendOTP();
  }
};
```

This ensures:
- **Free plan**: Always goes to OTP verification, then creates the account directly (the existing `verifyOTPAndCreateAccount` flow handles this perfectly already)
- **Monthly/Yearly**: Goes to Stripe checkout as before
- **Test mode** (payments disabled): All plans go to OTP

**2. Store blocks during free account creation**

The existing `verifyOTPAndCreateAccount` flow (line 384-407) saves links but does NOT save blocks. Add block creation after the links insert:

```
// After links insert, also create blocks
if (formData.blocks.length > 0) {
  const blocksToInsert = formData.blocks.map((block, index) => ({
    profile_id: profileResult.id,
    block_type: block.type,
    content: block.content || {},
    sort_order: index,
    is_active: true,
  }));
  await supabase.from("personal_blocks").insert(blocksToInsert);
}
```

This same block-saving logic also needs to be added to the existing-account flow (around line 678-690).

**3. Ensure blocks are saved in the paid (Stripe) flow too**

In `handleStripeCheckout` (line 484-502), the signup data saved to sessionStorage already includes `blocks`. In `PersonalSignupComplete.tsx`, blocks are NOT being saved after payment verification. Add block creation in the finalize step (after links at line 229-252):

```
// After links, also create blocks
if (savedData.blocks && savedData.blocks.length > 0) {
  await supabase.from("personal_blocks").delete().eq("profile_id", profile.id);
  const blocksToInsert = savedData.blocks.map((block, index) => ({
    profile_id: profile.id,
    block_type: block.block_type,
    content: block.content || {},
    sort_order: index,
    is_active: true,
  }));
  await supabase.from("personal_blocks").insert(blocksToInsert);
}
```

**4. Hide "Secure checkout powered by Stripe" for free plans**

Update the Stripe reassurance text (line 1148) to only show for paid plans:

```
{PERSONAL_PAYMENTS_ENABLED && !isFreePlan && (
  <div className="flex items-center justify-center gap-2 ...">
    <Shield ... />
    <span>Secure checkout powered by Stripe</span>
  </div>
)}
```

## Summary of files to modify

1. **`src/components/personal/signup/CheckoutStep.tsx`** -- Route free plans to OTP, save blocks in both new-user and existing-user flows, hide Stripe badge for free
2. **`src/pages/personal/PersonalSignupComplete.tsx`** -- Save blocks after Stripe payment verification

## Data flow verification (all 3 paths)

| Data field | Free (OTP) | Monthly (Stripe) | Yearly (Stripe) |
|---|---|---|---|
| full_name | Saved in profile insert | Saved via PersonalSignupComplete | Same |
| username | Saved in profile insert | Created by verify-personal-checkout, updated in Complete | Same |
| profile_photo | Uploaded after sign-in | Saved as base64 in sessionStorage, uploaded in Complete | Same |
| header_type/color/image | Saved in profile insert | Updated in Complete | Same |
| background_color | Saved in profile insert | Updated in Complete | Same |
| card_headline | Saved in profile insert | Updated in Complete | Same |
| links | Inserted after profile | Inserted in Complete | Same |
| blocks | **NEW: Inserted after profile** | **NEW: Inserted in Complete** | Same |
| welcome email | Sent | Sent by verify-personal-checkout | Same |
