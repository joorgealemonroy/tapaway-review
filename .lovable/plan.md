

# Subtle Sign-Up CTA Bar for Personal Profile Hubs

## What changes

Replace the current large promotional popup (`FreeTrialPopup`) approach with a slim, non-intrusive floating bar that appears **only on personal profile hub pages** (e.g., `tapaway.co/jorge`). The existing `FreeTrialPopup` on landing pages remains untouched.

---

## New component: `ProfileSignupBar`

**File:** `src/components/personal/ProfileSignupBar.tsx`

A slim, sticky bottom bar inspired by link-in-bio signup prompts:

- **Height:** ~44px, single row with text + small button
- **Position:** Fixed bottom, full width on mobile, max-w-md centered on desktop
- **Style:** Semi-transparent frosted glass (`backdrop-blur`), soft shadow, rounded-full pill shape with slight inset from edges (`bottom-3 left-3 right-3`)
- **Copy:** `"Create your digital card — free"` with a small `"Sign up free"` button
- **Dismiss:** Small x button on the right
- **Animation:** Subtle slide-up + fade (150ms), no spring bounce
- **Session logic:** Uses `sessionStorage` key `tapaway_profile_bar_shown` -- only shows once per session
- **Delay:** Appears after 2 seconds of page load (not immediate)
- **Does NOT show** if the viewer is the profile owner (check auth user ID vs profile user ID)

Design tokens:
- Background: `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl`
- Border: `border border-gray-200/50 dark:border-white/10`
- Shadow: `shadow-lg`
- Button: small pill, `bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full`
- Text: `text-sm text-gray-700 dark:text-gray-200`

---

## Integration point

**File:** `src/pages/personal/PersonalProfilePage.tsx`

Add `<ProfileSignupBar />` inside the component's return JSX, just before the closing `</div>`. The bar is self-contained and manages its own visibility.

---

## What stays the same

- `FreeTrialPopup` on `Index.tsx` and `Personal.tsx` landing pages -- unchanged
- The existing footer CTA ("Start using TapAway" glass pill) in the profile page -- stays as a secondary, passive CTA
- `TrialBanner` component -- unchanged (different purpose)

---

## Technical details

### `ProfileSignupBar.tsx` structure

```text
Fixed bottom bar (z-40, below QR code z-50)
+----------------------------------------------------------+
| [lightning icon] Create your digital card -- free  [Sign up free] [x] |
+----------------------------------------------------------+
```

- Uses `framer-motion` for enter/exit animation
- `AnimatePresence` wrapping
- `sessionStorage.getItem("tapaway_profile_bar_shown")` check
- 2-second `setTimeout` before showing
- Links to `/personal/signup`
- Accepts optional `profileUserId` prop to hide bar when the logged-in user is viewing their own profile

### Props

```typescript
interface ProfileSignupBarProps {
  profileUserId?: string; // hide if current auth user matches
}
```

