

# Add Dark/Light Mode Toggle to Mobile Landing Navigation

## What Changes
Add a dark/light mode toggle switch to the mobile hamburger menu (the slide-out sheet) on the landing pages, so visitors can switch between light and dark mode.

## Technical Details

### File: `src/components/landing/MobileNav.tsx`

- Import `Moon`, `Sun` icons from lucide-react and `Switch` from the UI library
- Add state for `isDark`, initialized from `localStorage.getItem('tapaway_dashboard_theme')`
- Add a `useEffect` to apply/remove the `dark` class on `document.documentElement` and persist the preference to localStorage (same pattern used in `MobileBottomNav.tsx`)
- Add a toggle row at the bottom of the menu items (above the footer links), showing a Sun/Moon icon and a Switch component

The toggle will use the exact same localStorage key (`tapaway_dashboard_theme`) and class-toggling logic already used in the dashboard's mobile nav, keeping behavior consistent across the app.

