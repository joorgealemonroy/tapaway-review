

# Reduce Bottom Spacing on Profile Pages

## Problem

The footer area has excessive bottom padding (`mt-12 pb-6`) plus `space-y-3` and the `min-h-screen` on the inner container, creating a lot of dead space at the bottom — especially noticeable on mobile.

## Changes

### `src/pages/personal/PersonalProfilePage.tsx`

1. **Footer spacing** (line 1424): Change `mt-12 pb-6` to `mt-6 pb-4` — cuts the top margin in half and tightens bottom padding
2. **Inner container** (line 1166): Change `min-h-screen` to `min-h-[100dvh]` on mobile to use dynamic viewport height (avoids extra space from browser chrome), keep the same for desktop

| Line | Before | After |
|------|--------|-------|
| 1424 | `mt-12 pb-6` | `mt-6 pb-4` |
| 1166 | `min-h-screen` | `min-h-[100dvh]` (both outer + inner wrappers) |

One file changed: `src/pages/personal/PersonalProfilePage.tsx`

