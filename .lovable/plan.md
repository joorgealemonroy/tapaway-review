

# Vibe Selection + Simplified Signup — Updated Plan

This incorporates the approved plan plus the new suggestion: the ClaimStep username input shows a celebratory real-time availability message.

## New Files

### 1. `src/lib/vibeTemplates.ts`
Define three vibe templates (Artemis, Balcombe, Boultont) with `mockupTheme`, `style`, `defaultLinks`, and `defaultBlocks`. Extends the existing `LayoutTemplate` interface with `subtitle` and `mockupTheme` fields.

### 2. `src/components/personal/PhoneMockup.tsx`
Reusable phone frame component — bezel, notch, inner content area. Accepts a vibe theme and renders a static preview of sample links/blocks in that color scheme.

### 3. `src/pages/personal/VibeSelection.tsx`
- Dark gradient background, "Choose Your Vibe" title
- Embla Carousel (`loop: true, align: "center"`) with 3 PhoneMockups
- Active slide: `scale(1), opacity(1)`; adjacent: `scale(0.8), opacity(0.5)` via scroll progress
- Dot indicator synced to `selectedIndex`
- "Use This Vibe →" button stores vibe ID in sessionStorage, plays a framer-motion scale-up animation, then navigates to `/personal/signup?vibe=true`

### 4. `src/components/personal/signup/ClaimStep.tsx`
Minimal "Claim Your Name" step — replaces IdentityStep when coming from vibe flow.

**Username input front and center:**
- Large input with `tapaway.co/` prefix (or `tapaway.co/tap` for free plan)
- Debounced availability check (reuse existing `is_username_available` RPC)
- When available, show a celebratory green message below the input:
  ```
  ✓ tapaway.co/yourname is available!
  ```
  with a subtle scale-in animation (framer-motion) to create the "micro-win" moment

**Auth buttons below:**
- "Save My Hub with Google" (OAuth button with Google icon)
- "Save My Hub with Apple" (OAuth button with Apple icon)
- Divider: "or use email"
- "Continue with Email" → progressive disclosure expands Name + Email + Password fields
- Reuses existing `lovable.auth.signInWithOAuth()` logic from IdentityStep

### Modified Files

### 5. `src/App.tsx`
Add `/personal/vibe` route (lazy loaded).

### 6. `src/pages/personal/PersonalSignup.tsx`
- On mount, check `tapaway_selected_vibe` in sessionStorage
- If present, apply vibe template (same pattern as existing template logic) and set `fromVibeFlow = true`
- When `fromVibeFlow`, render `ClaimStep` instead of `IdentityStep` for step 1, and set `effectiveSteps = [1, 3]` (skip LinksStep since vibe pre-fills content)

### 7. `src/components/landing/personal/PersonalHero.tsx`
Update primary CTA to link to `/personal/vibe` instead of `/personal/signup`.

