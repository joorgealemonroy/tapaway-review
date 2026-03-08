

# Improve Button Style Picker with Realistic Link Previews

## Problem
The current theme picker shows tiny abstract rectangles — users can't visualize how their actual links (Instagram, X, etc.) will look with each theme.

## Solution
Replace the mini-preview rectangles with realistic mock link pills showing recognizable platform names and icons, so users see exactly what each theme looks like before selecting.

## Changes

### `DashboardDesignTab.tsx` (lines 605-630)
Replace the current 5-column grid of abstract rectangles with a vertical list of theme cards. Each card shows:
- Theme name + description on the left
- Two stacked mini link pills on the right (e.g. "Instagram" and "X / Twitter") styled with that theme's actual CSS logic
- The pills use the user's current `headerColor` for themes that reference it (filled, glass)
- Selected state highlighted with primary border

The layout changes from a cramped 5-col grid to a more spacious list that gives each theme enough room to show realistic previews — similar to how Linktree's theme picker works.

### Visual per theme:
- **Glass**: Semi-transparent pill with blur, icon box + label
- **Filled**: Solid headerColor background, white text, no icon
- **Outline**: Transparent with visible border, icon + label  
- **Soft**: White pill with shadow, icon + label
- **Shadow**: Full rounded-pill, bold shadow, centered text only

No other files change. The renderer and data flow are already working correctly.

