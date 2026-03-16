

# Linear Onboarding: Personalize Step for Vibe Users

## Overview
Add a new "Personalize" step (Step 2) to the vibe signup flow. Currently, vibe users skip from Claim (step 1) directly to Checkout (step 3). This change inserts a focused handle-input screen between them.

## New Component: `PersonalizeStep.tsx`

Create `src/components/personal/signup/PersonalizeStep.tsx` — a mobile-first screen that:

1. **Reads the vibe's links** from `formData.links` (already populated with placeholder values like `@yourname`)
2. **Renders a vertical stack** of input rows, one per link:
   - Platform icon + label on the left
   - Input field (pre-filled with placeholder, e.g. `@yourname`) with the vibe's accent-colored border on focus
   - "Skip" button (X icon) on the right — removes the link via `removeLink(id)`
   - Green check icon appears when the value differs from the placeholder (i.e., user typed something real)
3. **"+ Add another link"** button at the bottom opens the existing `LinkModal`
4. **"Launch My Hub →"** large CTA button at the bottom, styled with the vibe's accent color
5. **Background glow** — 15% opacity radial gradient using the vibe's `glowColor`, consistent with ClaimStep
6. **Real-time URL sync** — as user types a handle, call `getPlatformConfig(type).generateUrl(value)` to update the link's `url` field via `updateLink`

### Input validation
- Check icon appears when: value is not empty AND differs from default placeholder (`@yourname`, `you@email.com`, etc.)
- No blocking validation — users can launch with placeholders (they become editable later in dashboard)

## Flow Changes in `PersonalSignup.tsx`

1. Change `effectiveSteps` for vibe flow from `[1, 3]` to `[1, 2, 3]` — vibe users now get all 3 steps
2. Step 2 renders `PersonalizeStep` instead of `LinksStep` when `fromVibeFlow` is true
3. Step titles update: step 2 becomes "Personalize your links"
4. Pass `vibeMetadata` (name, glowColor, accentColor) to `PersonalizeStep`

## Component Props
```typescript
interface PersonalizeStepProps {
  formData: SignupData;
  updateLink: (id: string, updates: Partial<PersonalLink>) => void;
  removeLink: (id: string) => void;
  addLink: (link: Omit<PersonalLink, "id">) => void;
  onNext: () => void;
  onBack: () => void;
  vibeMetadata: { name: string; glowColor: string; accentColor: string } | null;
}
```

## Files to Modify

| File | Change |
|------|--------|
| **New** `src/components/personal/signup/PersonalizeStep.tsx` | Handle input screen with skip buttons, add-link, launch CTA |
| `src/pages/personal/PersonalSignup.tsx` | Re-enable step 2 for vibe flow, conditionally render PersonalizeStep vs LinksStep, update step title |

No route or database changes needed — `/personal/signup` already handles all steps, and CheckoutStep (step 3) already persists links to the database.

