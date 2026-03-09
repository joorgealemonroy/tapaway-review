

# Fix Analytics Overview: Readability, Chart, and Layout

## Issues

1. **Welcome card unreadable in dark mode** — `gradient-subtle` is hardcoded to near-white (`hsl(213 27% 98%)` → `hsl(213 27% 96%)`), never overridden in `.dark`. Text becomes invisible.
2. **Chart only shows days with data** — If only 2 days have events, only 2 points appear. Should always show all 7 days with 0-fill for empty days.
3. **Empty square next to Peak Day** — The 3-column grid (`grid-cols-2 sm:grid-cols-3`) leaves the 3rd card alone on a second row on mobile, creating an empty cell.

## Changes

### 1. `src/index.css` — Add dark mode gradient-subtle override

Inside the `.dark` block, override `--gradient-subtle` to use dark surface colors:
```css
--gradient-subtle: linear-gradient(180deg, hsl(217 33% 18%), hsl(222 47% 13%));
```

### 2. `src/components/dashboard/AnalyticsOverview.tsx`

**Chart: fill all 7 days.** After computing `dateGroups`, generate a full 7-day array from today backwards, defaulting missing days to 0 taps:
```ts
const allDays = [];
for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  allDays.push({ date: label, taps: dateGroups[label] || 0 });
}
```

**Stats grid: 3 cards in a single row on mobile.** Change `grid-cols-2 sm:grid-cols-3` to `grid-cols-3` so all 3 stat cards always sit in one row, eliminating the empty cell. Reduce padding on mobile (`p-3 sm:p-6`).

**Welcome card: use theme-aware classes** instead of `gradient-subtle`. Replace with `bg-card border border-border` so it works in both modes, or use `bg-primary/5` for subtle tinting.

## Files changed

| File | Change |
|------|--------|
| `src/index.css` | Dark mode `--gradient-subtle` override |
| `src/components/dashboard/AnalyticsOverview.tsx` | Full 7-day chart, fix grid to 3-col, theme-aware welcome card |

