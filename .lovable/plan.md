

# Fix: vCard Photo Not Loading on iOS

## Problem

The screenshot shows iOS displaying the contact with no photo. Two issues:

1. **Base64 line too long**: iOS vCard parser is strict about line length. vCard spec requires lines to be folded at 75 characters. A base64-encoded photo produces a single extremely long line that iOS silently ignores.
2. **URI fallback doesn't work on iOS**: `PHOTO;VALUE=uri:` is poorly supported on iOS — it won't fetch remote URLs.

## Fix

In `src/lib/vcard.ts`:

1. **Add line folding**: After generating the `PHOTO;ENCODING=b;TYPE=...:` line, fold it per RFC 2426 — first line up to 75 chars, continuation lines start with a space and are up to 75 chars each. This is what iOS requires to parse base64 photos.

2. **Use canvas fallback for CORS**: If `fetch()` fails due to CORS, use an `<img>` + `<canvas>` approach to load the image cross-origin and extract base64 via `canvas.toDataURL()`. This works in Safari/iOS browsers where `fetch` may be blocked but `<img crossorigin>` is allowed.

3. **Always produce base64**: Remove the URI fallback entirely since iOS doesn't support it. If both fetch and canvas fail, omit the photo (current behavior is broken anyway with URI).

### Line folding function
```typescript
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = line.substring(0, 75);
  let i = 75;
  while (i < line.length) {
    result += '\r\n ' + line.substring(i, i + 74);
    i += 74;
  }
  return result;
}
```

### Canvas-based fallback
```typescript
async function fetchImageViaCanvas(url: string): Promise<{base64: string; type: string} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, type: 'JPEG' });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
```

### Updated photo embedding
```typescript
if (data.profilePhotoUrl) {
  let photo = await fetchImageAsBase64(data.profilePhotoUrl);
  if (!photo) photo = await fetchImageViaCanvas(data.profilePhotoUrl);
  if (photo) {
    const photoLine = `PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`;
    lines.push(foldLine(photoLine));
  }
}
```

## File

| File | Change |
|------|--------|
| `src/lib/vcard.ts` | Add `foldLine()`, add `fetchImageViaCanvas()` canvas fallback, apply line folding to PHOTO line, remove URI fallback |

