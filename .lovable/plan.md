

# Add Flashing Red Indicator to Placeholder Social Tiles

## Problem
Placeholder "Add TikTok" / "Add Instagram" tiles in the dashboard are just dimmed (opacity-50). Users don't notice they need to add their social handles.

## Solution
Add a pulsing red dot/badge and a subtle red border glow to any link card whose URL starts with `#placeholder-`. This makes them impossible to miss.

## Changes

### `src/components/personal/DashboardUnifiedContent.tsx`

In the grid tile rendering (around line 762), detect placeholder links and add visual indicators:

- Check `link.url?.startsWith('#placeholder-')` 
- If true: replace `opacity-50` with a pulsing red ring (`ring-2 ring-red-500 animate-pulse`) and add a small red dot badge in the top-right corner
- The label ("ADD TIKTOK") stays as-is but gets a red tint
- Remove the dim opacity so the photo background stays vibrant — the red ring is the attention-grabber

Also add the same logic to the pill-style link cards (around line 840+) in case a placeholder is rendered as a pill.

### CSS Addition (`src/index.css`)

Add a custom `@keyframes` for a subtle red glow pulse if the Tailwind `animate-pulse` isn't punchy enough:

```css
@keyframes red-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(239,68,68,0.4); }
  50% { box-shadow: 0 0 12px rgba(239,68,68,0.8); }
}
```

### Expected Result
Placeholder tiles show with a pulsing red border/glow and a red dot, clearly signaling "action needed" while keeping the photo background visible and aesthetic.

| File | Change |
|------|--------|
| `src/components/personal/DashboardUnifiedContent.tsx` | Add placeholder detection + red pulse styling to grid and pill cards |
| `src/index.css` | Add `red-glow` keyframe animation |

