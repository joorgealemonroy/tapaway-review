

# Speed Up HubShowcase on /personal/pricing

## Problem

The "Real Hubs, Real People" section makes 3 DB queries (profiles → then links+blocks in parallel) before rendering anything. On mobile, this causes a visible delay with nothing shown. Additionally, 6 profile photos start downloading only after the queries complete.

## Fix

### 1. Add skeleton loading state (`HubShowcase.tsx`)

Show a shimmer placeholder carousel immediately while data loads, so users see the section structure right away instead of blank space.

```typescript
const [loading, setLoading] = useState(true);
// ... set loading = false after fetch
// If loading, render 4 skeleton cards matching the card dimensions
```

### 2. Lazy-load profile images

The 6 profile photos (128px thumbnails) all load at once. Add `loading="lazy"` to images beyond the first 2 visible cards since the carousel is horizontally scrollable.

### 3. Remove unnecessary data from initial query

The HubShowcase fetches links and blocks data just for the "Copy Layout" feature — but the user first sees the cards visually. Defer the links/blocks fetch until a user taps "Copy Layout" on a specific profile, or fetch them in the background after the initial render.

**Approach**: Split into two phases:
- **Phase 1 (immediate)**: Fetch profiles only → render cards with skeletons → show photos
- **Phase 2 (background)**: Fetch links+blocks after cards are visible

## Files to Modify

| File | Change |
|------|--------|
| `src/components/card/HubShowcase.tsx` | Add loading skeletons, defer links/blocks fetch, lazy-load images |

