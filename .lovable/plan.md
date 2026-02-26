

# Add Dark Mode Support to Card Activation Pages (`/c/:code`)

## Problem
The `CardResolver` and `CardOnboarding` components use hardcoded light-mode colors (`bg-gradient-to-b from-teal-50 via-white to-white`, `bg-gradient-to-b from-gray-50 to-white`, `bg-teal-100`, `border-gray-200`, `text-teal-600`, `bg-gray-200`, `shadow-teal-200/50`, etc.) instead of theme-aware Tailwind tokens. Users who prefer dark mode see a jarring all-white page.

## Changes

### 1. `src/pages/CardResolver.tsx`

Replace hardcoded colors with theme-aware equivalents:

- **Not-found screen** (line 244): `from-gray-50 to-white` → `bg-background`
- **Activation UI wrapper** (line 273): `from-teal-50 via-white to-white` → `bg-background`
- **Card shadow** (line 285): `shadow-teal-200/50` → `shadow-teal-500/20 dark:shadow-teal-400/10`
- **Step indicator lines** (line 328): `bg-gray-200` → `bg-border`
- **Step indicator inactive text** (line 330): `text-gray-300` → `text-muted-foreground/40`
- **Step indicator active text**: `text-teal-600` → `text-teal-600 dark:text-teal-400`
- **Input borders** (lines 356, 436): `border-gray-200 focus:border-teal-400 focus:ring-teal-400` → `border-border focus:border-teal-500 focus:ring-teal-500`
- **Buttons**: `bg-teal-600 hover:bg-teal-700` stays (works in both modes, white text is fine)
- **Claiming spinner** (line 472): `text-teal-600` → `text-teal-600 dark:text-teal-400`

### 2. `src/components/card/CardOnboarding.tsx`

Replace hardcoded colors:

- **Page wrapper** (line 39): `from-teal-50 via-white to-white` → `bg-background`
- **Card shadow** (line 49): `shadow-teal-200/50` → `shadow-teal-500/20 dark:shadow-teal-400/10`
- **Step number circles** (line 119): `bg-teal-600` stays (works both modes)
- **Info card icon backgrounds** (line 171): `bg-teal-100` → `bg-teal-100 dark:bg-teal-900/30`
- **Info card icon color** (line 172): `text-teal-600` → `text-teal-600 dark:text-teal-400`
- **Info card containers** (line 169): already using `border-border bg-card` (correct)

### Files Modified
- `src/pages/CardResolver.tsx` — Theme-aware backgrounds, borders, text colors
- `src/components/card/CardOnboarding.tsx` — Theme-aware backgrounds, icon containers

