## Regenerate Favicon Set from Uploaded TA Logo

Replace the previously-generated brand icon with the user's actual TA logo (blue "TA" on white background) across every favicon size.

### Steps

1. **Ingest the source**: Copy `user-uploads://image-161.png` to `/tmp/ta-logo-source.png` as the master 1024×1024 asset.
2. **Regenerate the icon set** using Python/Pillow, overwriting the existing files:
   - `public/favicon-16x16.png` (16×16)
   - `public/favicon-32x32.png` (32×32)
   - `public/apple-touch-icon.png` (180×180)
   - `public/favicon.ico` (multi-size: 16, 32, 48)
3. **Preserve** the `<head>` links and JSON-LD in `index.html` — no changes needed there since filenames stay the same.

### Notes

- The 16×16 favicon will use nearest-neighbor-aware resampling (LANCZOS) to keep the "TA" glyph legible at tiny sizes.
- Browsers aggressively cache favicons; a hard refresh (Cmd/Ctrl+Shift+R) will be required after deploy to see the new icon.
