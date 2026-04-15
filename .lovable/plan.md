

# Dashboard UI Upgrade: Linktree-Style Visual Builder

## Summary

Upgrade the Business Lite dashboard from form-heavy editing to a real-time visual builder with smart link auto-population, persistent live preview, and polished card-based UI.

## What Already Exists

- **Live Preview Panel**: `ProfilePreviewPanel` already renders a phone mockup on desktop (`xl:` breakpoint, right sidebar) and below the content on mobile. It updates live as `links`, `blocks`, and `profile` state change.
- **Drag-and-Drop**: Already implemented with native HTML5 drag + touch hold-to-drag in `DashboardUnifiedContent.tsx`.
- **Card-based layout**: Links already render as compact cards with grip handles, icons, and dropdown menus.

So the core architecture is already in place. The main gaps are:

1. **No OG metadata auto-fetch** when adding/editing links
2. **Mobile preview is buried** at the bottom of the Links tab (no toggle)
3. **Cards lack thumbnails/favicons** and could use a visual refresh

## Implementation Plan

### 1. New Edge Function: `fetch-link-metadata`

Create `supabase/functions/fetch-link-metadata/index.ts` that:
- Accepts `{ url: string }` via POST
- Fetches the URL server-side (follows redirects)
- Parses HTML for `og:title`, `og:image`, `og:description`, favicon (`<link rel="icon">`)
- Returns `{ title, image, favicon, description }`
- Rate limited (10 req/min per IP)
- Validates URL is http/https only

### 2. Smart Auto-Populate in LinkModal

Update `src/components/personal/LinkModal.tsx`:
- When user selects "Website" platform and pastes/finishes typing a URL, debounce 800ms then call `fetch-link-metadata`
- Auto-fill the "Label" field with `og:title` (user can override)
- Show a small favicon preview next to the URL input
- If `og:image` exists, offer it as the thumbnail with one click
- Show a subtle loading spinner during fetch

### 3. Mobile Preview Toggle

Update `src/pages/personal/PersonalDashboard.tsx`:
- Replace the inline mobile preview (currently at bottom of Links tab) with a floating "Preview" FAB button on mobile
- Tapping it opens a bottom sheet / full-screen overlay with the `ProfilePreviewPanel`
- The sheet updates live since it reads the same React state
- Desktop layout stays the same (sticky sidebar)

### 4. Visual Card Refresh (Glassmorphism Polish)

Update `src/components/personal/DashboardUnifiedContent.tsx`:
- Add favicon/thumbnail display on link cards (small image left of label)
- Add subtle glassmorphism styling: `bg-white/5 backdrop-blur-sm border-white/10` (dark mode aware)
- Add inline active/inactive toggle (small Switch component) replacing the dropdown menu item
- Show URL subtitle below label in muted text
- Smooth `transition-all` on drag with slight scale

### 5. Store Thumbnail/Favicon on Links

The `personal_links` table already has `thumbnail_url` and `thumbnail_bg_url` columns. When the OG scraper returns a favicon, store it in `thumbnail_url` so it persists and renders on the card.

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/fetch-link-metadata/index.ts` | **New** — OG tag scraper edge function |
| `src/components/personal/LinkModal.tsx` | Add auto-fetch on URL paste, auto-fill label + thumbnail |
| `src/components/personal/DashboardUnifiedContent.tsx` | Card visual refresh: favicon display, inline toggle, glassmorphism, URL subtitle |
| `src/pages/personal/PersonalDashboard.tsx` | Mobile preview toggle FAB + bottom sheet, remove inline preview |

## Technical Details

**Edge function** uses native `fetch` + regex parsing (no heavy dependencies):
```typescript
const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1];
const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
const favicon = html.match(/<link[^>]+rel="(?:icon|shortcut icon)"[^>]+href="([^"]+)"/i)?.[1];
```

**Debounced fetch** in LinkModal:
```typescript
useEffect(() => {
  if (selectedPlatform?.type !== 'website' || !inputValue.includes('.')) return;
  const timer = setTimeout(async () => {
    const res = await supabase.functions.invoke('fetch-link-metadata', { body: { url } });
    if (res.data?.title && !customLabel) setCustomLabel(res.data.title);
    if (res.data?.favicon) setThumbnailUrl(res.data.favicon);
  }, 800);
  return () => clearTimeout(timer);
}, [inputValue]);
```

**Mobile preview** uses existing `Drawer` component for the bottom sheet overlay.

## Priority Order

1. `fetch-link-metadata` edge function (core enabler)
2. LinkModal auto-populate integration
3. Mobile preview toggle
4. Card visual refresh

