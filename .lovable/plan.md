

# Fix Instagram/TikTok Double-Wrapping on Edit+Save

## Problem

When editing an Instagram or TikTok link in the dashboard and pressing Save (even without changes), the URL gets double-wrapped — e.g. `instagram://user?username=instagram://user?username=handle`. This corrupts the link.

## Root Cause

In `LinkModal.tsx` line 112, when editing, the input is pre-filled with `editingLink.value`. This value comes from `convertToPersonalLink` which uses `extractValue(url)`. If `extractValue` ever fails to strip the protocol (edge cases, corrupted data), the input contains the full URL, and `generateUrl` wraps it again.

Additionally, `handleSave` in `LinkModal` calls `generateUrl(inputValue.trim())` without first cleaning the value through `extractValue`, so if a user pastes a full URL into a handle field, it gets double-wrapped.

## Fix

### `src/lib/platformLinks.tsx` — Harden `extractValue` + add `cleanValue` helper

1. Add a `cleanValue(rawInput)` helper to each platform config that runs `extractValue` on the input, ensuring any pasted URL or protocol prefix is stripped before `generateUrl` runs
2. For simplicity, just update `generateUrl` on each handle-type platform to first strip known URL prefixes from the input before generating

**Instagram** (line 229):
```ts
generateUrl: (v) => {
  // Strip any existing URL prefix to prevent double-wrapping
  const clean = v.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "")
                  .replace(/^instagram:\/\/user\?username=/, "")
                  .replace(/^@/, "").split("/")[0];
  return `instagram://user?username=${clean}`;
},
```

**TikTok** (line 242):
```ts
generateUrl: (v) => {
  const clean = v.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "")
                  .replace(/^@/, "").split("/")[0];
  return `https://tiktok.com/@${clean}`;
},
```

Apply the same defensive pattern to all other handle-type platforms (X, Threads, Twitch, Snapchat, Pinterest, Telegram, OnlyFans) so they all strip their own URL prefix before re-generating.

### `src/components/personal/LinkModal.tsx` — Belt-and-suspenders

In the `handleSave` function (~line 264), before calling `generateUrl`, run the value through `extractValue` first:

```ts
const handleSave = () => {
  if (!selectedPlatform || !inputValue.trim()) return;
  // Clean the value through extractValue to strip any URL prefixes
  const rawValue = inputValue.trim();
  const value = selectedPlatform.extractValue(rawValue) || rawValue;
  const url = selectedPlatform.generateUrl(value);
  // ...rest unchanged
};
```

### Files

| File | Change |
|------|--------|
| `src/lib/platformLinks.tsx` | Harden all `generateUrl` functions to strip URL prefixes |
| `src/components/personal/LinkModal.tsx` | Run `extractValue` on input before `generateUrl` in `handleSave` |

