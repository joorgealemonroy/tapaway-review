

# Add Instagram Deep Link to Restaurant Hubs

## Changes — `src/pages/ReviewHub.tsx`

1. **Add helper function** (after `isSafeUrl`, ~line 182): Convert stored Instagram web URLs to `instagram://user?username=...` deep links for native app opening on mobile.

2. **Update Instagram href** (line 679): Change `href={restaurant.instagram_url!}` to `href={getInstagramDeepLink(restaurant.instagram_url!)}`.

3. **Update `isSafeUrl` check for Instagram** (line 677): Check against the raw `instagram_url` (which is always valid if present), not the deep-linked version.

No other files need changes. The `isSafeUrl` function already permits `instagram:` protocol.

