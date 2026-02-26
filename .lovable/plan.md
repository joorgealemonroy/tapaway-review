

# Add Dark/Light Mode Toggle to Card Activation Pages

## What's Changing
A small sun/moon toggle button will appear in the top-right corner of all `/c/:code` screens so users can switch between light and dark mode. It follows the same pattern already used on the landing page and dashboard.

## Technical Details

### 1. `src/pages/CardResolver.tsx`
- Import `Sun`, `Moon` from lucide-react
- Add `isDark` state initialized from `localStorage.getItem('tapaway_dashboard_theme')`
- Add `useEffect` to toggle `.dark` class on `document.documentElement` and persist to localStorage
- Render a small icon button (absolute top-right) in both the not-found screen and the activation UI wrapper

### 2. `src/components/card/CardOnboarding.tsx`
- Same `isDark` state + `useEffect` pattern
- Render the same toggle button in the top-right corner of the onboarding overview page

### Button Style
A ghost-variant icon button positioned `fixed top-4 right-4` with `Sun` (in dark mode) or `Moon` (in light mode), matching the existing app convention. Uses `z-50` to stay above animated content.

### Files Modified
- `src/pages/CardResolver.tsx`
- `src/components/card/CardOnboarding.tsx`

