

# Card Customizer: HTML-Rendered Double-Sided Preview with Editable Text

## Summary
Replace the static `TapAwayCard3D` in Step 3 with a fully HTML/CSS-reconstructed card customizer. Users edit headline, sub-headline, and upload a logo — all rendered live on front & back card previews.

## New Component: `src/components/onboarding/CardCustomizer.tsx`

A self-contained component rendering:

### Card Face (HTML/CSS reconstruction matching the uploaded reference)
- **Front card**: White background, portrait aspect ratio (2.125 / 3.375)
  - 5 yellow star icons (top, centered)
  - Editable headline text (centered, sans-serif, ~14px)
  - Editable sub-headline text (centered, lighter weight)
  - Large grey circle (centered) — shows uploaded logo or "YOUR LOGO HERE" placeholder
  - Bottom section: NFC tap icon (left) | divider | QR code icon (right)
  - "tapaway.co" footer text
- **Back card**: Same layout but simplified (logo circle + QR + URL)

### Input Fields (above the previews)
- "Card Headline" — text input, placeholder: `Loved your visit? Leave us a review!`
- "Card Sub-headline" — text input, placeholder: `Tap or Scan below to share your experience.`

### Layout
- On mobile: cards stacked vertically with "Front" / "Back" labels
- On desktop: side-by-side

### 3D Effect
- Each card wrapper gets `perspective(1000px) rotateX(8deg) rotateY(-4deg)` for floating feel
- Subtle shadow: `0 20px 40px rgba(0,0,0,0.3)`

## Changes to `src/pages/Onboarding.tsx` (Step 3)

### Replace the existing card preview block (lines 509-516)
- Import and render `<CardCustomizer>` instead of `TapAwayCard3D`
- Pass props: `logoUrl`, `businessName`, `onHeadlineChange`, `onSubHeadlineChange`

### New state
- `cardHeadline` (string, default: `"Loved your visit? Leave us a review!"`)
- `cardSubHeadline` (string, default: `"Tap or Scan below to share your experience."`)

### Persistence update
- Add `cardHeadline` and `cardSubHeadline` to the `saveOnboardingData()` call in `handleOAuth`
- Include them in the `fulfillment_orders` upsert metadata

## Changes to `src/lib/onboardingData.ts`

- Add `cardHeadline?: string` and `cardSubHeadline?: string` to `OnboardingData` interface

## Files modified
1. `src/components/onboarding/CardCustomizer.tsx` — new component
2. `src/pages/Onboarding.tsx` — wire up customizer + new state + persistence
3. `src/lib/onboardingData.ts` — extend interface

