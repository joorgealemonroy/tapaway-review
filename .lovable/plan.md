
# Fix: Hide Header Image Upload for Full Banner Mode

## Problem
The `HeaderCustomizer` component (used during signup) currently has a two-way conditional: "color" shows color pickers, and everything else (including "banner") shows the image upload UI. When a user selects "Full Banner," they shouldn't see an upload option -- the profile photo is used automatically.

The dashboard version (`DashboardDesignTab.tsx`) already handles this correctly with a three-way check. This fix brings the shared `HeaderCustomizer` component in line with that behavior.

## Change

### File: `src/components/personal/HeaderCustomizer.tsx`

Replace the two-way ternary (line 161) with a three-way conditional:

- **`"color"`** -- show color/gradient presets and hex input (unchanged)
- **`"banner"`** -- show only the existing info message ("Your profile photo will be used as a full-width banner"). No upload UI at all.
- **`"image"`** -- show the image upload/crop UI (unchanged)

Currently the code is:
```
{headerType === "color" ? (
  <ColorSection />
) : (
  <ImageUploadSection />  // <-- banner falls through here
)}
```

It will become:
```
{headerType === "color" ? (
  <ColorSection />
) : headerType === "image" ? (
  <ImageUploadSection />
) : null}
```

The banner info box (lines 152-158) already renders above this conditional when `headerType === "banner"`, so no additional UI is needed -- banner mode will show only that info message and nothing else.

This is a single-line logic change in one file, affecting all users everywhere the `HeaderCustomizer` is used.
