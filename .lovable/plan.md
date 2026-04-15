

# Add Marketing Cards to Profile Footer

## Overview
Add three new elements (CTA pill, Examples card, Features card) to the `PersonalProfilePage.tsx` footer area, between the Shop section and the existing "Start using TapAway" footer badge. All content stays inside the existing `max-w-md mx-auto px-4` container with dark glassmorphism styling.

## Changes

### File: `src/pages/personal/PersonalProfilePage.tsx`

Insert a new section block between line ~1521 (end of Shop section) and line ~1523 (Footer). This block contains:

**1. CTA Pill** — A full-width rounded pill button with cyan/primary background. Main text "Try It Free", subtext "We'll send you cards that tap". Links to `/onboarding`.

**2. Examples Card** — A dark glassmorphism card (`bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4`). Title "See real businesses using TapAway". Contains a `<select>` dropdown styled dark with 4 options (Bakery, Barbershop, Car Wraps, Restaurant). Below it, a "View Live Profile" link pill that navigates to the corresponding slug:
- Bakery → `/sugarbloom`
- Barbershop → `/spacestudios`
- Car Wraps → `/rebornwraps`
- Restaurant → `/islasmarias`

Uses `useState` for the selected option.

**3. Features Card** — Same glassmorphism style. Title "Everything in one place". 2-column grid (3 rows) with Lucide icons:
- Star → Reviews
- Link → Links & Socials
- UserPlus → Contact / Save Phone
- UtensilsCrossed → Menu & Services
- BarChart3 → Analytics
- ShoppingBag → Shop

Each item: icon + label + one-line description in small muted text.

### Technical Details
- Add `useState` import (already imported) for the examples dropdown selection
- Add new Lucide icon imports: `Star`, `Link`, `UtensilsCrossed`, `BarChart3`, `ShoppingBag` (some may already be imported)
- All styling uses existing dark-mode conventions (`text-white`, `text-white/60`, `bg-white/5`, etc.)
- No new files needed — all additions inline in the existing footer area

