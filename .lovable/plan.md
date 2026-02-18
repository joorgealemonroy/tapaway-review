

# Fix: Banner Preview Display in Profile Builder

## Problem

When "Full Banner" is selected with a profile photo, the preview has visual issues:

1. **White text on white background**: Banner mode forces `isDarkBg = true`, making all text white. But the content area below the banner only gets a colored background IF `extractedBannerColor` is successfully extracted. If extraction hasn't completed or fails, the content sits on the default white/light background with invisible white text.

2. **Banner takes too much space**: The banner uses `h-48` (192px) in a 560px tall phone frame, consuming over a third of the visible area, making the preview feel cramped.

3. **No profile photo scenario**: When banner is selected but no photo is uploaded yet, `hasBanner` becomes false and the preview falls back to a plain color header, which is confusing since the user selected "Full Banner."

## Changes

### File: `src/components/personal/ProfilePreviewRenderer.tsx`

1. **Add fallback background for banner content area**: When `hasBanner` is true but `extractedBannerColor` is null (not yet extracted), use a dark fallback color (e.g., the background color or a dark default) so white text remains readable.

2. **Reduce banner height in preview context**: When rendering inside the compact preview panel, use a smaller banner height (`h-32` instead of `h-48`) so the preview doesn't feel dominated by the banner image.

3. **Show a placeholder banner when no photo exists**: When `headerType === "banner"` but there's no `profile_photo_url`, render a gradient placeholder banner with a message or icon indicating a photo is needed, rather than silently falling back to a color header.

### Specific code changes:

**Content area fallback** (around line 747-749):
- Change the content area `style` to always apply a background when in banner mode
- Use `extractedBannerColor` if available, otherwise fall back to a dark color like `#1a1a1a`

```typescript
style={hasBanner ? { backgroundColor: extractedBannerColor || '#1a1a1a' } : undefined}
```

**Banner height adjustment** (around line 624):
- Reduce from `h-48` to `h-36` for better proportion in the small preview frame

**No-photo banner placeholder** (around line 621-641):
- Add a condition: when `headerType === "banner"` but no `profile_photo_url`, show a gradient placeholder div with the header color, maintaining banner layout styling (dark bg, white text, no avatar) so the user can see what banner mode will look like once they add a photo

```typescript
const hasBanner = headerType === "banner"; // Always true in banner mode
const bannerUrl = (headerType === "banner" && profile.profile_photo_url) 
  ? getOptimizedImageUrl(profile.profile_photo_url, 400, 80) 
  : null;
```

Then in the JSX:
```typescript
{hasBanner ? (
  <div className="h-36 overflow-hidden relative">
    {bannerUrl ? (
      <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover object-top" />
    ) : (
      <div className="h-full w-full flex items-center justify-center" 
           style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColor}88)` }}>
        <span className="text-white/60 text-xs">Add a photo for your banner</span>
      </div>
    )}
    {/* gradient fade overlay */}
  </div>
) : (
  /* existing non-banner header */
)}
```

This way banner mode always looks like banner mode, whether or not a photo exists yet, and text is always readable against the background.
