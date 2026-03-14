

# Fix Import Layout: YouTube "Vlogs" as Both + Pills for Other Links

## What the user wants

For `hoo.be/bsmfredo`, the TapAway preview should render:
1. **Social icon bar**: Instagram, YouTube, X icons
2. **YouTube "Vlogs"** — uses `display_style: "both"` (appears as icon in the icon bar AND as a half-width button below)
3. **YouTube "Sauce"** — half-width button next to Vlogs (with cover image)
4. **"Work with me 1 on 1"** — standard pill
5. **"Trenchies Candy"** — standard pill

## Changes

### `src/pages/personal/ImportProfile.tsx` — `scrapedToPreviewProps`

Update the content link mapping logic (lines 160-178):

- **First YouTube content link with an image** → `display_style: "both"`, `grid_size: "half"`, `cover_image_url` set. This makes it show as an icon in the social bar AND as a half-width image button.
- **Second YouTube content link with an image** → `display_style: "pill"`, `grid_size: "half"`, `cover_image_url` set. Half-width image button next to the first.
- **All other content links** → `display_style: "pill"`, no grid/cover. Standard pill buttons.

The logic: track whether we've seen the first YouTube-with-image link. If so, mark it as "both"; the next YouTube-with-image gets "half" pill. Everything else stays as a plain pill.

