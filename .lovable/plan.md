

# Admin Portal: Accordion Nav + Remove Founding Creators

## Changes

### 1. Sales Rep Portal → Collapsible Accordion on Mobile
- Wrap the "Sales Rep Portal" section in a `Collapsible` component (already available in the project)
- On mobile: collapsed by default with a chevron toggle, showing title "Sales Rep Portal" as the trigger
- On desktop: always visible (use `md:block` to bypass the collapsible behavior, or keep it collapsible everywhere for consistency)
- The card grid inside remains unchanged

### 2. Remove Founding Creators
- Remove the `{ label: "Founding Creators", ... }` entry from the `NAV_CARDS` array (line 74)
- Remove the `Crown` icon import if no longer used
- The `/admin/founders` route and `AdminFounders.tsx` page can remain (accessible by direct URL) but won't be linked from the dashboard

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Wrap Sales Rep Portal section in `Collapsible` (closed by default on mobile), remove Founding Creators from `NAV_CARDS`, clean up unused `Crown` import |

