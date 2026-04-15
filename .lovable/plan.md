

# Transform tapaway.co/socials into a High-Converting Landing Page

## Overview
Create a new dedicated landing page at `/socials` designed to convert visitors into signups. The page replaces the generic personal landing content with a focused, conversion-oriented layout featuring real business demos, a clear CTA, and a features showcase.

## Page Structure

```text
┌─────────────────────────────────────────┐
│  LandingNav                             │
├─────────────────────────────────────────┤
│  HERO                                   │
│  Headline + subtext + "Try It Free" CTA │
│  "We'll send you cards that tap"        │
├─────────────────────────────────────────┤
│  SEE EXAMPLES (dropdown demos)          │
│  Dropdown: Bakery / Barbershop /        │
│    Car Wraps / Restaurant               │
│  Each opens clickable iframe/link to:   │
│    sugarbloom / spacestudios /          │
│    rebornwraps / islasmarias            │
├─────────────────────────────────────────┤
│  FEATURES — "Everything in One Place"   │
│  Grid of 6 feature cards:              │
│  • Reviews (Google reviews)             │
│  • Links & Socials                      │
│  • Contact / Save Phone                 │
│  • Menu & Services                      │
│  • Analytics                            │
│  • Shop (sell courses etc, 0% fee)      │
├─────────────────────────────────────────┤
│  FOOTER CTA — "Try It Free"            │
│  + Footer                               │
└─────────────────────────────────────────┘
```

## Technical Changes

| File | Action |
|------|--------|
| `src/pages/Socials.tsx` | **New file** — Full landing page with Hero, Examples dropdown, Features grid, Footer CTA |
| `src/App.tsx` | Add route: `<Route path="/socials" element={<Socials />} />` |

## Examples Section Details
- Styled dropdown/select with 4 categories: Bakery, Barbershop, Car Wraps, Restaurant
- Selecting a category shows a phone mockup preview + a "Visit Live Profile" button linking to:
  - Bakery → `tapaway.co/sugarbloom`
  - Barbershop → `tapaway.co/spacestudios`
  - Car Wraps → `tapaway.co/rebornwraps`
  - Restaurant → `tapaway.co/islasmarias`
- Default selection: Bakery (sugarbloom)

## Features Section — "Everything in One Place"
Six feature cards in a responsive grid (2 cols mobile, 3 cols desktop):
1. **Reviews** — Collect Google reviews with one tap
2. **Links & Socials** — All your platforms in one place
3. **Contact / Save Phone** — Visitors save your contact instantly
4. **Menu & Services** — Showcase what you offer
5. **Analytics** — See who visits and what they click
6. **Shop** — Sell courses, guides, products. TapAway takes 0%

## CTA Buttons
- "Try It Free" buttons link to `/onboarding` (the signup/onboarding flow)
- Subtext: "We'll send you cards that tap"

## Design
- Matches existing landing page aesthetic (dark sections, motion animations, card components)
- Uses existing `LandingNav` and footer pattern from `Personal.tsx`

