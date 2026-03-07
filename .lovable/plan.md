

# Fix Profile Photo Cache Staleness

## Root Cause

The `getOptimizedImageUrl()` function in `OptimizedImage.tsx` strips ALL query params (including the `?t=` cache-buster) and replaces them with `?width=X&quality=Y`. This means:

1. Dashboard uploads a new photo and saves `profile.jpg?t=1772868981000` to the DB
2. When rendering, `getOptimizedImageUrl` strips `?t=...` → `profile.jpg?width=640&quality=85`
3. Supabase CDN / browser serves the old cached version since the URL hasn't changed

This affects both the live profile page and the dashboard preview.

## Fix

**File: `src/components/personal/OptimizedImage.tsx`** (lines 18-28)

Preserve the cache-buster `t` param when rebuilding the URL:

```typescript
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality = 85
): string {
  if (!url) return '';
  if (!url.includes('supabase.co/storage')) return url;
  
  const [baseUrl, queryString] = url.split('?');
  
  // Pre-optimized webp - just preserve cache buster
  if (baseUrl.endsWith('.webp')) {
    const t = new URLSearchParams(queryString || '').get('t');
    return t ? `${baseUrl}?t=${t}` : baseUrl;
  }
  
  // Preserve cache-buster timestamp if present
  const t = new URLSearchParams(queryString || '').get('t');
  const cacheBuster = t ? `&t=${t}` : '';
  return `${baseUrl}?width=${width}&quality=${quality}${cacheBuster}`;
}
```

Apply the same fix to `generateSrcSet` (lines 34-49) — extract and append `t` param.

Also update `preloadCriticalImages` in `useProfileData.ts` (line 35) — it currently calls `getOptimizedImageUrl` which will now correctly preserve the cache buster, so no separate change needed there.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/personal/OptimizedImage.tsx` | Preserve `?t=` cache-buster in `getOptimizedImageUrl` and `generateSrcSet` |

