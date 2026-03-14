

# Fix Grid Pairing & Social Link Labels

## Problems

1. **Grid pairing too aggressive**: The current logic pairs ANY two consecutive links that have images as `grid_size: "half"`. For bsmfredo, only the two YouTube cards should be side-by-side — other links like "Work with me" and "Trenchies Candy" should be full-width pills even if they have images.

2. **Social links show raw platform name**: X/Twitter social icons get `label: "x"` from the scraper (since icon-only links use the platform type as label). This looks odd when rendered.

## Changes — `src/pages/personal/ImportProfile.tsx`

### A. Smarter grid pairing — only pair same-platform consecutive image links

Replace the current "pair all consecutive image links" logic with: only pair consecutive image links that share the same `link_type` (e.g., two `youtube` links side by side). All other image links become standard pills with `thumbnail_url`.

```text
Before: pair imageIndices[0]+imageIndices[1], imageIndices[2]+imageIndices[3], etc.
After:  only pair imageIndices[k] + imageIndices[k+1] if they have the same link_type
```

### B. Proper social icon labels

In the social link mapping, capitalize platform names properly instead of using the raw scraper label (e.g., "X" instead of "x", "Instagram" instead of "instagram"). Since these render as icons, the label is secondary but should still be presentable.

## File
- `src/pages/personal/ImportProfile.tsx` — update grid detection logic (lines 149-159) and social label mapping (line 219)

