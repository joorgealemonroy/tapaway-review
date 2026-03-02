

# Why Contact Photos Don't Show on Mobile

## Root Cause

The `profilePhotoUrl` is passed to `downloadVCard()` correctly (line 739), but the `generateVCard()` function in `src/lib/vcard.ts` **never writes a `PHOTO` property** into the vCard output. The field exists in the interface but is completely ignored in the generation logic (lines 30-76). So the `.vcf` file has no photo data at all.

## Fix

**File**: `src/lib/vcard.ts`

In `generateVCard()`, after the website block and before `END:VCARD`, fetch the image URL as a base64-encoded blob and embed it using the vCard `PHOTO` property:

```
PHOTO;ENCODING=b;TYPE=JPEG:<base64data>
```

Since fetching and encoding the image is async, the function signatures need to change:
- `generateVCard` becomes `async` and returns `Promise<string>`
- `downloadVCard` becomes `async` and returns `Promise<void>`
- Inside `generateVCard`: fetch the `profilePhotoUrl`, convert the response to an `ArrayBuffer`, then base64-encode it
- Determine the image type from the response `Content-Type` header (JPEG, PNG, etc.)
- If the fetch fails (CORS, network), silently skip the photo — the contact still saves without it

The caller in `PersonalProfilePage.tsx` (`handleSaveContact`) needs to `await downloadVCard(...)` instead of calling it synchronously.

### Files to modify (2):
- `src/lib/vcard.ts` — add async photo fetching + base64 embedding in the PHOTO field
- `src/pages/personal/PersonalProfilePage.tsx` — make `handleSaveContact` async to await the download

