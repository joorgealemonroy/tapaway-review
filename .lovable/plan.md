## Root cause

When you click **Crop current photo**, the handler in `src/pages/personal/PersonalDashboard.tsx` (~line 1001) does:

```ts
const cleanUrl = profile.profile_photo_url.split("?")[0];
setRawImageUrl(cleanUrl);
```

Right after **Replace photo**, `profile.profile_photo_url` is the new upload with a fresh `?t=<timestamp>` cache-buster appended (see `handleCropComplete` around line 537 building `urlWithCacheBust`). Stripping `?t=...` yields the bare Storage URL — which the browser (and the CDN) already have cached from before the replace, so the cropper loads the **old** image.

## Fix

In `PersonalDashboard.tsx` "Crop current photo" menu item:

- Don't strip the query string. Pass `profile.profile_photo_url` through as-is so the fresh `?t=` cache-buster forces a new fetch.
- If no cache-buster is present (older profiles), append one on the fly: `url + (url.includes("?") ? "&" : "?") + "t=" + Date.now()`.

That's the entire change — a two-line tweak inside the existing `DropdownMenuItem` onClick. Supabase's `personal-photos` public bucket serves proper CORS headers regardless of query string, so `ImageCropper`'s `crossOrigin="anonymous"` load still works.

## Files touched

- `src/pages/personal/PersonalDashboard.tsx` — remove the `.split("?")[0]` and always ensure a cache-buster on the URL passed to `setRawImageUrl`.

No changes to `ImageCropper.tsx`, the upload flow, or the DB.
