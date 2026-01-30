

# Plan: Change Instagram Links to Use Deep Link Format

## Overview

Update the Instagram platform configuration to generate deep links (`instagram://user?username=`) instead of web URLs. This opens the Instagram app directly on mobile devices, providing a better user experience.

---

## Current Behavior

When a user enters their Instagram username (e.g., `trepif`), the system generates:
```
https://instagram.com/trepif
```

This opens in the browser, which may prompt the user to "Open in app" on mobile.

---

## New Behavior

When a user enters their Instagram username (e.g., `trepif`), the system generates:
```
instagram://user?username=trepif
```

This directly opens the Instagram app on mobile devices. On desktop browsers, it may prompt to open Instagram or show an error if the app isn't installed.

---

## Technical Change

### File: `src/lib/platformLinks.tsx`

Update the Instagram `generateUrl` function (line 229):

| Before | After |
|--------|-------|
| `generateUrl: (v) => \`https://instagram.com/${v.replace(/^@/, "")}\`` | `generateUrl: (v) => \`instagram://user?username=${v.replace(/^@/, "")}\`` |

**Full updated config:**
```typescript
{
  type: "instagram",
  label: "Instagram",
  icon: Instagram,
  inputType: "handle",
  placeholder: "yourname",
  prefix: "@",
  generateUrl: (v) => `instagram://user?username=${v.replace(/^@/, "")}`,  // Updated
  extractValue: (url) => url.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "").replace(/^instagram:\/\/user\?username=/, "").split("/")[0] || "",  // Updated to handle both formats
  color: "text-white",
  bgColor: "bg-[#E4405F]",
  gradient: "bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]",
},
```

---

## User Experience

- **Mobile (iOS/Android)**: Tapping the Instagram link opens the Instagram app directly to that user's profile
- **Desktop**: May show "Open Instagram?" prompt or fallback behavior depending on the browser
- **User input**: No change — users still just enter their username (e.g., `trepif` or `@trepif`)

---

## Backward Compatibility

The `extractValue` function needs to be updated to recognize both formats:
- Old format: `https://instagram.com/username`
- New format: `instagram://user?username=username`

This ensures existing profiles with web URLs can still be parsed correctly if edited.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/platformLinks.tsx` | Update `generateUrl` to use `instagram://user?username=` format, update `extractValue` to handle both URL formats |

---

## Example

**User enters:** `trepif`

**Generated URL:** `instagram://user?username=trepif`

**Link behavior:** Opens Instagram app → navigates to @trepif's profile

