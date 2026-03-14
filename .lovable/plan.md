

# Fix Import Data Property Mismatch

## Problem
The import page stores link images as a single `imageUrl` field plus a `displayHint` ("cover" vs "thumbnail"), but the signup consumer reads `thumbnailUrl` and `coverImageUrl` as separate properties. They're always `undefined`, so images and grid layouts are silently lost.

## Root Cause — `src/pages/personal/ImportProfile.tsx` line 328-336

`handleClaimPage` flattens both image types into one `imageUrl` field:
```
imageUrl: l.cover_image_url || l.thumbnail_url || null
displayHint: "cover" | "thumbnail" | "pill"
```

But the consumer in `PersonalSignup.tsx` reads:
```
thumbnailUrl: link.thumbnailUrl      // undefined
coverImageUrl: link.coverImageUrl    // undefined
```

## Fix — `src/pages/personal/ImportProfile.tsx`

In `handleClaimPage`, store `thumbnailUrl` and `coverImageUrl` as separate properties (matching what the consumer expects):

```js
const allLinks = mappedLinks.map(l => ({
  label: l.label,
  url: l.url,
  type: l.link_type,
  thumbnailUrl: l.thumbnail_url || null,
  coverImageUrl: l.cover_image_url || null,
  displayStyle: l.display_style,
  gridSize: l.grid_size,
}));
```

Remove `imageUrl` and `displayHint` — they're not consumed anywhere. This single change aligns the data shape so half-width grids and thumbnail/cover images transfer correctly.

## Files
- `src/pages/personal/ImportProfile.tsx` — fix `handleClaimPage` property names

