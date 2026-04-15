

# Make Cards Tab Visible on Desktop Dashboard (+ Admin View)

## Problem
The "Cards" tab content exists and is accessible via mobile bottom nav, but the desktop `TabsList` has no `TabsTrigger` for "cards" — making it invisible on desktop. This also affects admin impersonation view since it uses the same dashboard.

## Changes

### File: `src/pages/personal/PersonalDashboard.tsx`

1. **Add `CreditCard` to the lucide-react import** (already used in `CardsTab` but not imported in the dashboard file).

2. **Add a Cards `TabsTrigger`** after the "Plan" trigger (line ~740), before the profile switcher dropdown. Update the grid from `grid-cols-7` to `grid-cols-8` to accommodate the new tab.

```
<TabsTrigger value="cards" className="flex items-center gap-2">
  <CreditCard className="h-4 w-4" />
  <span className="hidden sm:inline">Cards</span>
</TabsTrigger>
```

3. **Update `grid-cols-7` → `grid-cols-8`** on the `TabsList` to fit the additional tab.

No changes needed for admin view — it already renders the same `Tabs` component and loads the same `CardsTab` content. The admin banner and impersonation logic are unaffected.

