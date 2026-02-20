

# Prioritize Link Images (Instagram, TikTok, etc.) for Maximum Speed

## Problem

Link cover images and thumbnails (Instagram, TikTok, etc.) are critical visual elements of the hub, but they currently load without any priority hints -- no `loading="eager"`, no `fetchPriority`, and no Supabase image optimization in `PersonalProfilePage`. Only the first cover image is preloaded.

## Changes

### 1. Preload ALL link cover images and thumbnails (PersonalProfilePage.tsx)

Expand the existing preload `useEffect` (line 614) to include **all** link cover images and thumbnails, not just the first one:

```typescript
// Preload ALL link images
data.links.forEach(l => {
  if (l.cover_image_url) urls.push(getOptimizedImageUrl(l.cover_image_url, 640, 85));
  if (l.thumbnail_url) urls.push(getOptimizedImageUrl(l.thumbnail_url, 160, 85));
});
```

### 2. Add priority loading to ProfileLink component (PersonalProfilePage.tsx)

Add an `index` prop to `ProfileLink` so the first 4 links get `loading="eager"` and `fetchPriority="high"`, while the rest stay lazy:

- Grid cover images (line 90): Add `loading`, `fetchPriority` based on index
- Full-width cover images (line 122): Same
- Thumbnail images (line 196): Add `loading="eager"` and `fetchPriority="high"` for first 4

Also apply `getOptimizedImageUrl` to cover images and thumbnails in PersonalProfilePage (currently raw URLs -- the ProfilePreviewRenderer already does this but the public profile page does not).

### 3. Pass index through all ProfileLink call sites (PersonalProfilePage.tsx)

- Featured link (line 1003): `index={0}`
- Grid group links (line 1015): pass running index
- Regular links (line 1020): pass running index

### 4. Add priority to ProfilePreviewRenderer link images (ProfilePreviewRenderer.tsx)

Same pattern: add `loading="eager"` and `fetchPriority="high"` to the first 4 link images so the dashboard preview also loads fast.

### 5. Preload link images in useProfileData hook (useProfileData.ts)

Expand the existing `preloadCriticalImages` function to also preload all link cover images and thumbnails (not just the first cover), so images start downloading the moment the API responds:

```typescript
// Also preload all link cover images
data.links.forEach(l => {
  if (l.cover_image_url) urls.push(l.cover_image_url);
  if (l.thumbnail_url) urls.push(l.thumbnail_url);
});
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Preload all link images, add `index` prop to ProfileLink, apply `getOptimizedImageUrl` to cover/thumbnail URLs, add `loading="eager"` + `fetchPriority="high"` for first 4 links |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Add `loading="eager"` + `fetchPriority="high"` for first 4 link images |
| `src/hooks/useProfileData.ts` | Preload all link cover images and thumbnails in `preloadCriticalImages` |

## Technical Notes

- Limiting eager loading to the first 4 links prevents overloading the browser's connection pool (browsers have 6 parallel connections per domain)
- `getOptimizedImageUrl` is already used in ProfilePreviewRenderer but was missing from PersonalProfilePage for link images -- this ensures Supabase serves right-sized images
- All preloads use `<link rel="preload">` which fires before React renders, giving a 50-200ms head start
