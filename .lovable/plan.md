

# Use Real ProfilePreviewRenderer for After Preview

Instead of the custom `AfterPreview` mockup, use the actual `ProfilePreviewPanel` component (which wraps `ProfilePreviewRenderer` in a phone frame) to show exactly what the user's TapAway profile will look like.

## Changes

### File: `src/pages/personal/ImportProfile.tsx`

1. **Import `ProfilePreviewPanel`** from `@/components/personal/ProfilePreviewPanel`

2. **Delete the entire `AfterPreview` component** (lines 121–237) — no longer needed

3. **Add a converter function** that maps `ScrapedData` → the `ProfileData` + `LinkData[]` + `BlockData[]` format that `ProfilePreviewRenderer` expects:

```ts
function scrapedToProfile(data: ScrapedData): {
  profile: { id: string; full_name: string; username: string; bio?: string | null; profile_photo_url?: string | null; header_type: string; header_color: string; background_color: string; };
  links: LinkData[];
  blocks: BlockData[];
} {
  // Map social links as icon-style, content links as pills (with cover images if available)
  const allLinks = [
    ...data.socialLinks.map((l, i) => ({
      id: `social-${i}`, label: l.label || l.type, url: l.url,
      link_type: l.type, is_active: true, display_style: 'icon' as const,
      sort_order: i, cover_image_url: null, grid_size: null, thumbnail_url: null,
    })),
    ...data.links.map((l, i) => ({
      id: `link-${i}`, label: l.label, url: l.url,
      link_type: l.type, is_active: true,
      display_style: l.imageUrl ? 'pill' : 'pill',
      sort_order: 100 + i,
      cover_image_url: l.imageUrl || null,
      grid_size: l.imageUrl ? 'half' : null,
      thumbnail_url: null,
    })),
  ];
  return {
    profile: {
      id: 'import-preview', full_name: data.name || 'Your Name',
      username: 'preview', bio: data.bio,
      profile_photo_url: data.photoUrl,
      header_type: 'color', header_color: '#6366f1',
      background_color: '#000000',
    },
    links: allLinks,
    blocks: [],
  };
}
```

4. **Replace `<AfterPreview data={result} />`** (line 477) with the real `ProfilePreviewPanel`:

```tsx
{(() => {
  const { profile, links, blocks } = scrapedToProfile(result);
  return (
    <div className="flex flex-col items-center h-full">
      <p className="text-xs font-medium text-primary mb-3 uppercase tracking-wider">
        Your TapAway
      </p>
      <ProfilePreviewPanel profile={profile} links={links} blocks={blocks} />
    </div>
  );
})()}
```

5. **Remove unused imports** (`getPlatformConfig`, `PLATFORM_COLORS`, `detectPlatformFromUrl`, and unused lucide icons that were only for AfterPreview)

## Result
After clicking Import, the user sees their actual TapAway profile rendered in a phone frame with the real renderer — banner, avatar, branded social icons, glass pills, image grid cards — exactly as it will look when published.

## Files Modified
- `src/pages/personal/ImportProfile.tsx`

