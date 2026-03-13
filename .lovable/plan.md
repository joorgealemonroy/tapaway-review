

# Add Instagram Deep Link to Restaurant Hubs

## Problem
Restaurant hubs link to Instagram using standard `https://instagram.com/...` URLs, which open in the browser. Personal hubs already convert these to `instagram://user?username=...` deep links that open the native app on mobile.

## Fix

**File: `src/pages/ReviewHub.tsx`** — Add a helper function to convert the stored Instagram URL to a deep link, and use it in the `href`:

```typescript
const getInstagramDeepLink = (url: string): string => {
  try {
    if (url.startsWith('instagram://')) return url;
    const username = url.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "").split("/")[0];
    if (username) return `instagram://user?username=${username}`;
  } catch {}
  return url;
};
```

Then on the Instagram `<a>` tag (~line 679), change:
```typescript
href={restaurant.instagram_url!}
```
to:
```typescript
href={getInstagramDeepLink(restaurant.instagram_url!)}
```

Also update the `isSafeUrl` check to allow `instagram:` protocol (already allowed on line 178).

One function addition, one line change.

