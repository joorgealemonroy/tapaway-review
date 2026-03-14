

# Upgrade AfterPreview to Match Real TapAway Profile Style

The current "After" preview uses a simplified dark mockup. The user wants it to look like an actual TapAway profile — matching the real `ProfilePreviewRenderer` aesthetic: gradient/banner header, overlapping circular avatar, branded social icon circles (Instagram gradient, TikTok black, etc.), pill links with platform icons and external-link arrows, and the signature dark glass style.

## Changes

### File: `src/pages/personal/ImportProfile.tsx`

Rewrite the `AfterPreview` component to closely mirror the real profile renderer:

1. **Header**: Gradient banner (`from-cyan-500 to-blue-600`) filling the top area, with the avatar overlapping the bottom edge — matching the real profile's banner layout
2. **Avatar**: Circular with a dark border, positioned to overlap the banner bottom (like the real profile)
3. **Name + Username**: Name in white, bio in muted white, centered below avatar
4. **Social Icon Row**: Use actual platform-colored circles (Instagram gradient, TikTok dark, etc.) instead of emoji badges — import `getPlatformConfig` and `PLATFORM_COLORS` from `@/lib/platformLinks` to render real icons with brand colors
5. **Pill Links**: Glass-style pills (`bg-white/10 border-white/20`) with platform icons on the left and an `ExternalLink` icon on the right — matching the real renderer's link style
6. **Background**: Black (`bg-zinc-950`) matching the default profile aesthetic

This reuses the same visual patterns as `ProfilePreviewRenderer` but with the scraped import data instead of database data.

## Files Modified
- `src/pages/personal/ImportProfile.tsx` — rewrite `AfterPreview` component

