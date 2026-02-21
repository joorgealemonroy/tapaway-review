

# Add Dark Mode Toggle to Mobile "More" Sheet

## What's changing
A dark/light mode switch will be added to the bottom of the "More" sheet in the mobile bottom navigation. When toggled, it will add or remove the `dark` class on the `<html>` element, which activates the existing dark mode CSS variables already defined in `index.css`. The preference will be saved to `localStorage` so it persists across sessions.

## How it works
The project already has a complete `.dark` color palette defined in `index.css` (lines 124-168). All UI components use CSS variable-based colors (`bg-background`, `text-foreground`, `bg-card`, etc.), so toggling the `dark` class on `<html>` will automatically update every component's colors -- no per-component changes needed.

## Changes

### 1. `src/components/personal/MobileBottomNav.tsx`
- Import `Moon`, `Sun` icons from lucide-react and the `Switch` component
- Add state for dark mode, initialized from `localStorage` (key: `tapaway_dashboard_theme`)
- Add a `useEffect` that toggles the `dark` class on `document.documentElement` and saves to `localStorage`
- Add a row at the bottom of the More sheet (below the tab buttons, separated by a divider) with a Sun/Moon icon, "Dark Mode" label, and a Switch toggle

### 2. `src/index.css` (minor)
- No changes needed -- the `.dark` variables are already comprehensive and all components use semantic color tokens

## Visual layout of the new row in the More sheet

```text
+------------------------------------------+
|  More Options                            |
+------------------------------------------+
|  [Mail]  Leads - View email captures     |
|  [Card]  Cards - Manage your NFC cards   |
|  [Shop]  Shop - Get a physical NFC card  |
|  [Star]  Plan - Subscription & billing   |
+------------------------------------------+
|  [Moon]  Dark Mode          [====Switch] |
+------------------------------------------+
```

The switch row uses the same styling as the tab rows (rounded, padded, with icon circle) but replaces the click-to-navigate behavior with a toggle switch on the right side.

## Technical details
- Theme state: `useState` initialized from `localStorage.getItem('tapaway_dashboard_theme')`, defaulting to `'light'`
- Toggle effect: `useEffect` that runs `document.documentElement.classList.toggle('dark', isDark)` and writes to `localStorage`
- The Switch component from `@/components/ui/switch` is already available
- The existing `.dark` CSS block covers all semantic tokens (background, foreground, card, popover, muted, border, primary, destructive, sidebar, surface, etc.)

## Files modified
| Action | File |
|--------|------|
| UPDATE | `src/components/personal/MobileBottomNav.tsx` |

