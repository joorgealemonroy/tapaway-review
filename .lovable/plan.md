

# Business Dashboard UX Improvements

## Issues to Fix

1. **Dark/Light mode toggle** — No theme toggle exists in the business dashboard nav. Add a sun/moon icon button in the top nav bar that toggles `tapaway_dashboard_theme` in localStorage and the `.dark` class on `<html>`.

2. **Instagram URL field** — The placeholder says `@yourbusiness` but the field expects a full URL. Change the placeholder to `https://instagram.com/yourbusiness` and add helper text. Also auto-prepend `https://instagram.com/` if user types just a handle (e.g. `@myplace`).

3. **"Need Help?" card not readable in dark mode** — `SupportTab.tsx` line 17 uses `gradient-subtle` which likely has hardcoded light colors. The card and its text need theme-aware classes (`bg-card`, `text-foreground`) instead of gradient classes that don't adapt to dark mode.

4. **Empty chart block on Overview** — When `chartData` is empty (no activity), the "Activity Over Time" section is hidden but leaves a visual gap. Show a friendly empty state instead: "No activity yet — place your cards on tables to start getting taps!"

5. **Activity chart aesthetic** — Current chart uses basic `BarChart` with flat gradient bars. Switch to use `AreaChart` with a smooth curve and subtle fill gradient (matching the personal hub's `LineChart` style with `ChartContainer`), plus dark-mode-aware axis/grid colors.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add theme toggle button in nav |
| `src/components/dashboard/SettingsTab.tsx` | Fix Instagram placeholder, auto-prepend URL logic, helper text |
| `src/components/dashboard/SupportTab.tsx` | Fix dark mode readability on "Need Help?" card, remove AI Coach references |
| `src/components/dashboard/AnalyticsOverview.tsx` | Add empty state for chart, restyle chart to AreaChart with smooth curve and theme-aware colors |

