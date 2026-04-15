

# Fix Card Club Activation — DB Fix + Systemic Code Fix

## Problem

The `addExtraCard` field is collected during signup and saved to sessionStorage, but **never read or acted upon** after payment. The Card Club flag (`has_card_addon`) is only set by the Stripe webhook for a *separate* `card_addon` checkout — meaning anyone who selected Card Club during initial signup never gets it activated.

**NY Sports Pizza** (profile `8d87b827-5858-473b-b843-4a4e342accf7`) has `has_card_addon: false` despite selecting it during signup.

## Changes

### 1. Quick DB Fix — Activate Card Club for NY Sports Pizza
Run a migration to set `has_card_addon = true` for profile ID `8d87b827-5858-473b-b843-4a4e342accf7`.

### 2. Systemic Fix — `PersonalSignupComplete.tsx`
After the profile is created in the signup completion flow (~line 200+), check the saved `addExtraCard` flag from sessionStorage. If `true`, update the newly created profile to set `has_card_addon = true`.

### 3. Systemic Fix — `CheckoutStep.tsx` (free/VIP direct creation path)
In the `verifyOTPAndCreateAccount` function (~line 460 profile insert), if `formData.addExtraCard` is `true`, include `has_card_addon: true` in the profile insert data.

| File | Change |
|------|--------|
| DB Migration | `UPDATE personal_profiles SET has_card_addon = true WHERE id = '8d87b827-...'` |
| `src/pages/personal/PersonalSignupComplete.tsx` | After profile creation, check `savedData.addExtraCard` and set `has_card_addon = true` |
| `src/components/personal/signup/CheckoutStep.tsx` | In `profileData` insert object, add `has_card_addon: formData.addExtraCard || false` |

