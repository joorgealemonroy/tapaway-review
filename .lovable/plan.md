
# Personalize Step — Implemented ✅

## Changes Made

### 1. Input UX — Empty values with placeholders
- `getFriendlyValue()` now returns `""` for all types
- Users see placeholder text via HTML `placeholder` attribute, type immediately

### 2. Display Mode — "both" default
- `PersonalSignup.tsx`: vibe links default to `displayStyle: "both"`
- `CheckoutStep.tsx`: DB insert defaults to `display_style: "both"`

### 3. Immediate Storage Upload
- `PersonalizeStep.tsx`: `handleCropComplete` uploads to `personal-link-images` bucket immediately
- Only short public URLs stored in state — safe for sessionStorage/localStorage

### 4. Half-Width Cover Images
- Links with `gridSize === "half"` show a 1:1 image upload box
- Separate file input ref for link cover images vs block images

### 5. Expanded "Add Block" Drawer
- Link, Image, YouTube Video, Text, Featured Button
- Inline editors for text (title + body), youtube (URL), button (label + URL)
