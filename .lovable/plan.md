
# Maximum Image Loading Speed

## Overview

Optimize image loading across the entire app -- profile hubs, landing pages, and dashboard previews -- to be as fast as possible without sacrificing visual quality. This involves aggressive preloading, proper `fetchpriority` hints, native browser optimizations, and eliminating unnecessary lazy-loading on above-the-fold content.

## Current State

- `OptimizedImage` and `OptimizedAvatar` components exist with lazy loading, async decoding, and Supabase URL transforms
- Profile pages preload header images via `new Image()` in a `useEffect`
- Collage/block images use `loading="lazy"` universally (even above the fold)
- Cover images on links (`<img src={coverImage}>`) have zero optimization -- no `loading`, `decoding`, or size hints
- Landing page card images (TapAway3D, PersonalCard3D) use `loading="lazy"` even though they're hero content
- No `<link rel="preload">` tags are injected for critical profile images
- Banner images use `backgroundImage` CSS (no preload, no `fetchpriority`)

## Changes

### 1. Preload critical profile images with `<link rel="preload">` (PersonalProfilePage.tsx)

Replace the current `new Image()` preload with proper `<link rel="preload" as="image">` injected into `<head>`. This tells the browser to fetch the image **before** it even starts rendering the component:

- Profile photo (avatar or banner) -- highest priority
- Header image (if type is "image")
- First cover image from links (if any)

This is done by expanding the existing `useEffect` at line 611 to inject/remove `<link>` elements.

### 2. Eager-load above-the-fold images in profile hubs (PersonalProfilePage.tsx)

- **Avatar** (line 919): Already uses `priority` prop -- good, no change needed
- **Banner** (line 840): Currently rendered as `background-image` CSS. Change to an actual `<img>` tag with `loading="eager"`, `fetchPriority="high"`, and `decoding="async"` for browser-prioritized fetching. The CSS background approach prevents the browser from discovering the image early.
- **Header image** (line 877): Same fix -- use `<img>` with eager loading instead of CSS `background-image`
- **Featured link cover image** (line 90-107): Add `loading="eager"` and `fetchPriority="high"` since it's rendered above fold
- **First 2-3 cover images**: Add `loading="eager"` only for the first few items; keep `loading="lazy"` for the rest

### 3. Add `decoding="async"` and size hints to all profile images (PersonalProfilePage.tsx)

- Cover images in `ProfileLink` (lines 91, 122): Add `decoding="async"` and `width`/`height` attributes to prevent layout shift and speed up decode
- Thumbnail images in regular links (line 194): Add `decoding="async"`
- Collage images (line 243): Already have `loading="lazy"` -- add `decoding="async"` for faster off-screen decode

### 4. Optimize `OptimizedImage` component fallback behavior (OptimizedImage.tsx)

- Remove the 300ms opacity transition for priority images (replace with 150ms) -- users see images faster
- Add `fetchPriority="high"` support (already present but ensure it's passed through)

### 5. Landing page hero images -- eager load (TapAwayCard3D.tsx, PersonalCard3D.tsx)

- Change `loading="lazy"` to `loading="eager"` for card images since they're in the hero section visible on first paint
- Add `fetchPriority="high"` and `decoding="async"`

### 6. Add image preloading to `useProfileData` hook (useProfileData.ts)

After fetching profile data, immediately start preloading critical images before the component even renders them:

```typescript
// After successful fetch, preload critical images
if (result) {
  const preloadUrls = [
    result.profile.profile_photo_url,
    result.profile.header_image_url,
  ].filter(Boolean);
  
  preloadUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getOptimizedImageUrl(url, 640, 85);
    document.head.appendChild(link);
  });
}
```

This means images start downloading the moment the API response arrives, not when React renders.

### 7. Optimize ProfilePreviewRenderer images (ProfilePreviewRenderer.tsx)

- Cover images in links (lines 352, 385): Add `decoding="async"` and use `getOptimizedImageUrl` for Supabase transforms (currently using raw URLs)
- Thumbnail images (line 439): Add `decoding="async"`
- Image blocks (line 515): Add `decoding="async"`
- Collage images (line 268): Add `decoding="async"`

## Files Changed

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Preload critical images via `<link>` tags, convert banner/header from CSS background to `<img>`, eager-load above-fold images, add `decoding="async"` everywhere |
| `src/hooks/useProfileData.ts` | Preload profile photo + header image immediately after API fetch |
| `src/components/personal/OptimizedImage.tsx` | Reduce fade duration for priority images (300ms to 150ms) |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Add `decoding="async"`, apply `getOptimizedImageUrl` to cover images and thumbnails |
| `src/components/TapAwayCard3D.tsx` | Change hero card images from lazy to eager loading |
| `src/components/PersonalCard3D.tsx` | Change hero card images from lazy to eager loading |

## Technical Notes

- Converting banner from `background-image` to `<img>` requires using `object-fit: cover` and `object-position: center top` to maintain the same visual appearance
- `fetchPriority="high"` is supported in Chrome 101+, Safari 17.2+, Firefox 132+ -- graceful degradation in older browsers
- `<link rel="preload" as="image">` is the fastest way to tell the browser about an image -- it starts fetching during HTML parse, before JS even runs
- No quality reduction -- all changes maintain the same quality settings (85-90 for transforms)
- The preload approach in `useProfileData` means the browser has a head start of ~50-200ms on image fetching compared to waiting for React render
