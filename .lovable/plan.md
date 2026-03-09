

# Fix: Apply Time Range Filter to Button Performance

## Problem
The `googleClicks`, `yelpClicks`, `instagramClicks`, `directionsClicks`, and `menuViews` counts are computed from **all** events, ignoring the 7d/30d toggle. Only `totalTaps` and chart data respect the `daysBack` filter.

## Fix (AnalyticsOverview.tsx)
Move the button-click counting to happen **after** the `cutoff` filter is applied, using `recentData` instead of `data`:

```tsx
// BEFORE (lines 74-79): counts from ALL data
const googleClicks = data.filter(...).length;

// AFTER: counts from filtered data
const recentData = data.filter(e => new Date(e.created_at) >= cutoff);
const googleClicks = recentData.filter(...).length;
```

The `mostClicked` calculation already uses these values so it will automatically update too.

## File
| File | Change |
|------|--------|
| `src/components/dashboard/AnalyticsOverview.tsx` | Move click counting below cutoff filter, use `recentData` |

