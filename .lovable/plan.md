

# Add Desktop Dark Mode Toggle + Default to Dark

## What's Changing
1. **Default theme becomes dark** — First-time visitors (no localStorage value) will see dark mode
2. **Desktop nav gets a theme toggle** — A Sun/Moon icon button added to DesktopNav, matching the mobile pattern
3. **Early theme initialization** — Apply dark class in `main.tsx` before React renders to prevent flash of light mode

## Technical Details

### 1. `src/main.tsx` — Early theme init
Add a synchronous script before `createRoot` that reads `localStorage.getItem('tapaway_dashboard_theme')` and applies the `.dark` class to `document.documentElement`. If no value exists, default to dark (add `.dark` class).

### 2. `src/components/landing/DesktopNav.tsx` — Add toggle button
- Import `Sun`, `Moon` from lucide-react and `useState`, `useEffect` from react
- Add `isDark` state initialized from localStorage (default: `true` when no value)
- Add `useEffect` to sync `.dark` class + localStorage
- Render a ghost icon button next to the nav links

### 3. Update default in all 4 existing files
Change the `useState` initializer from `=== 'dark'` to `!== 'light'` so the default (no localStorage) is dark:
- `src/components/landing/MobileNav.tsx` (line 18)
- `src/components/personal/MobileBottomNav.tsx` (line 29)
- `src/pages/CardResolver.tsx` (line 43)
- `src/components/card/CardOnboarding.tsx` (line 38)

### Files Modified (6 total)
- `src/main.tsx`
- `src/components/landing/DesktopNav.tsx`
- `src/components/landing/MobileNav.tsx`
- `src/components/personal/MobileBottomNav.tsx`
- `src/pages/CardResolver.tsx`
- `src/components/card/CardOnboarding.tsx`

Note: ReviewHub uses a separate theme key (`tapaway_hub_theme`) with its own light-mode default — that stays unchanged per existing design memory.

