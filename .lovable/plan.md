
# Three Fixes: Tap Prefix Link, Full Banner Option, Change Email Button

## 1. Make "tap" prefix upgrade text clickable (IdentityStep)

**File: `src/components/personal/signup/IdentityStep.tsx`**

The current text at line 222-225 says: `Upgrade to Pro to remove the "tap" prefix from your URL` as a plain `<p>` tag. Change it to a small, subtle clickable element that switches the plan to "yearly" when tapped. Style it as a very small, non-annoying link -- just underlined text, no loud colors or buttons.

- Replace the `<p>` with a `<button>` styled as subtle text (`text-xs text-muted-foreground underline cursor-pointer`)
- On click, call `updateFormData({ planType: "yearly" })` and show a toast confirming the upgrade
- Keep it small and non-intrusive

## 2. Add "Full Banner" as a third header option (HeaderCustomizer)

**File: `src/components/personal/HeaderCustomizer.tsx`**

The HeaderCustomizer currently only supports "color" and "image" as header types. The dashboard's `DashboardDesignTab` supports a third option: "banner" (Full Banner) which uses the profile photo as the banner image.

- Update the `Props` interface to accept `"color" | "image" | "banner"` for `headerType`
- Add a third `RadioGroupItem` with value `"banner"` labeled "Full Banner" with a Sparkles icon
- When "banner" is selected, show an info box explaining "Your profile photo will be used as a full-width banner" (matching the dashboard's design)
- No separate image upload needed for banner mode -- it uses the profile photo automatically

**File: `src/components/personal/signup/LinksStep.tsx`**

- Update the `onUpdate` handler for `HeaderCustomizer` to also gate "banner" behind Pro (same as "image")

## 3. Add "Change email" button on OTP verification screen (CheckoutStep)

**File: `src/components/personal/signup/CheckoutStep.tsx`**

Currently (lines 838-980), the OTP screen shows "Check your email" with the email address, OTP inputs, resend button, and a "Back to plan selection" button. Add a "Change email" button that:

- Goes back to the plan selection step (`setFlowStep("plan")`)
- Resets OTP state (`setOtpCode("")`, `setOtpError(null)`)
- Place it right after the email display text (line ~857), styled as a small text link: "Wrong email? Change it"
- This keeps it easy to find without redoing any steps -- the user just corrects the email and re-sends

## Summary of files to modify

1. `src/components/personal/signup/IdentityStep.tsx` -- Make "tap" prefix text a subtle clickable upgrade button
2. `src/components/personal/HeaderCustomizer.tsx` -- Add "banner" as third header type option
3. `src/components/personal/signup/LinksStep.tsx` -- Gate "banner" behind Pro like "image"
4. `src/components/personal/signup/CheckoutStep.tsx` -- Add "Change email" link on OTP screen
