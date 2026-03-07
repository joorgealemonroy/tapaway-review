

# Fix: Contact Save Photo Not Appearing in vCard

## Root Cause

The `fetchImageAsBase64()` function in `src/lib/vcard.ts` uses `fetch()` to download the profile photo and encode it as base64. This silently fails (returns `null`) due to CORS restrictions on cross-origin image fetches from storage URLs. The vCard is generated without any `PHOTO` line, so the contact appears with no image on the user's phone.

## Fix

Use a **dual approach** in `generateVCard`:

1. **Primary**: Embed the photo as a URI reference (`PHOTO;VALUE=uri:URL`) — this is supported by vCard 3.0 and works on iOS/Android without needing to fetch the image at all.
2. **Fallback**: Still attempt the base64 fetch. If it succeeds (same-origin or CORS-friendly), use the inline base64 encoding instead (better offline support).

This means the `PHOTO` line will always be present when a photo URL exists, guaranteeing the contact image shows up.

## Changes

**`src/lib/vcard.ts`**:
- In `generateVCard`, when `profilePhotoUrl` is provided: attempt base64 fetch first. If it fails, fall back to `PHOTO;VALUE=uri:URL` instead of silently omitting the photo entirely.
- Add `console.warn` in the catch block for debugging.

