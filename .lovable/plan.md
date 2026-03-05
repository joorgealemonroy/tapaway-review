

# Fix Card Activation Flow — 3 Issues

## Issues Identified

1. **OAuth not available after "Copy Layout"**: The `CardOnboarding` component's `onActivate` callback goes to `setStep("email")` in CardResolver, which does show OAuth buttons. However, when a user returns from OAuth (Google/Apple redirect back to `/c/CODE`), if they already have a profile it auto-claims; if not, it goes to signup. This flow is already working. The real gap: after OAuth sign-in returns, if the user has no profile, they get sent to `/personal/signup` but their OAuth session is detected — so OAuth IS available. This seems fine already. **Need to verify the "Copy Layout" button path**: `HubShowcase` calls `onCopyLayout` which maps to `onActivate` → `setStep("email")` — OAuth buttons are shown there. This is correct.

2. **Password asked twice**: When a new user activates via email+OTP, they create a password in CardResolver (step "password", line 496-540), which gets stored in sessionStorage. Then in `IdentityStep`, the password field is pre-filled but still shown — user sees it again. Fix: hide the password field in IdentityStep when `tapaway_card_preauthed` flag is set (similar to how OAuth hides it).

3. **White background = unreadable profile**: The DB default and all signup code defaults `background_color` to `#ffffff`. But the profile page's text classes use `text-foreground` which in light mode is dark (readable) but the profile page forces dark mode theme-color. The real issue: `isDarkBg` is computed from `bgColor`, and `#ffffff` is NOT dark, so text uses `text-foreground` — which should be dark/readable. Looking at the screenshot more carefully: the profile uses the older `PersonalProfile.tsx` (legacy) which has `bg-background` but the name "Jorge" appears very faint. The actual issue is likely that `isColorDark("#ffffff")` returns false → `headingClass = "text-foreground"` which on the white bg should work... unless dark mode is on. With dark mode, `text-foreground` = white text on `#ffffff` background = invisible.

   **Root cause**: The profile page sets `theme-color` to `#000000` and users may be in dark mode. With dark mode active, `text-foreground` = white, and `backgroundColor: #ffffff` = white → white on white = invisible.

   **Fix**: Change the default `background_color` from `#ffffff` to `#000000` in all signup paths. This matches the existing fallback in the profile page (`profile.background_color || "#000000"`). New profiles will default to black, which looks good and is readable with white text.

## Changes

### 1. `src/components/personal/signup/CheckoutStep.tsx`
- Change all 3 occurrences of `background_color: formData.backgroundColor || "#ffffff"` → `"#000000"`

### 2. `src/components/personal/signup/LinksStep.tsx`
- Change `background_color: formData.backgroundColor || "#ffffff"` → `"#000000"`

### 3. `src/pages/CardResolver.tsx` — Hide password step for pre-authed card users
- No change needed here — the password step is correct for new users activating via email

### 4. `src/components/personal/signup/IdentityStep.tsx`
- Detect `tapaway_card_preauthed` flag from sessionStorage
- When set, hide the password field (same as OAuth behavior) since password was already created during card activation
- Set a local flag similar to `isOAuthUser` to skip password validation

### 5. Database migration
- Update default for `background_color` column from `#ffffff` to `#000000`
- Backfill existing profiles that still have `#ffffff` to `#000000`

### Files to modify (4):
- `src/components/personal/signup/CheckoutStep.tsx` — default bg → `#000000`
- `src/components/personal/signup/LinksStep.tsx` — default bg → `#000000`
- `src/components/personal/signup/IdentityStep.tsx` — skip password when pre-authed via card
- DB migration — change column default + backfill

