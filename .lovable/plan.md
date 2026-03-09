

# Add 7-Day / 30-Day Toggle to Analytics Overview

## Change

Add a `ToggleGroup` (already used in `SignupDropoffCard`) to the welcome card area, letting users switch between 7-day and 30-day views. This affects:

1. **State**: Add `daysBack` state (default `7`), re-fetch/recompute when it changes
2. **Data filtering**: Change the `last7Days` cutoff to use `daysBack` value; fill chart with that many days instead of hardcoded 7
3. **Toggle UI**: Small `ToggleGroup` with "7d" and "30d" buttons, placed in the welcome card header row (right-aligned)
4. **Labels**: Update "Last 7 days" text to dynamically say "Last 7 days" or "Last 30 days"

## File: `src/components/dashboard/AnalyticsOverview.tsx`

- Import `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/toggle-group`
- Add `const [daysBack, setDaysBack] = useState(7)`
- Add `daysBack` to `useEffect` dependency array
- In `fetchAnalytics`: replace hardcoded `7` with `daysBack` for the date cutoff and chart day loop
- In the welcome card header row, add the toggle group right-aligned
- Update all "Last 7 days" labels to be dynamic

