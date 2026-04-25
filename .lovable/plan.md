## Goal

Make the live "Join our VIP Text List" block on public profiles match the centered, icon-free style shown in the dashboard preview.

## Changes

**File: `src/pages/personal/PersonalProfilePage.tsx`** (lines 731–739, inside `case "sms_subscribe"`)

- Remove the `<Smartphone />` icon and its surrounding circular badge `<div>`.
- Remove the flex row wrapper around the headline/description.
- Render the headline and description in a centered text block (`text-center`) above the button, matching the preview renderer's layout.

Resulting structure:
```text
[ Headline (centered) ]
[ Description (centered) ]
[ Full-width Join button ]
```

The button, padding, colors, and drawer trigger logic remain unchanged.

**No changes needed** to `ProfilePreviewRenderer.tsx` — the dashboard preview already renders centered with no icon.

**No changes needed** to the `Smartphone` import (it may become unused; will remove the import if it's no longer referenced elsewhere in the file).
