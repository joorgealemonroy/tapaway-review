# Make hub blocks readable on light backgrounds

## What's wrong

The link blocks — "Leave us a Review", "Check Us Out On Yelp", Directions, and every other standard link row — are styled for a dark hub. They are drawn as white-on-transparent glass (`bg-white/10`, white label text, `border-white/10`), and the Google/Yelp pill uses a white background with a `border-white/20` outline. On a light page (like the sampled white behind the Mariscos logo) that means: white card on white page, invisible border, and a white label on white for non-pill links. The block only looks correct because the icons are colored.

This is not specific to the Logo header — any hub with a light background has the same problem.

## The fix

Drive the block styling from the page background, using the same contrast helper the rest of the hub already uses.

- **Dark page** — unchanged. Glass cards, white text, white pill for Google/Yelp: byte-identical to today.
- **Light page** — blocks become an opaque surface with a visible edge and a soft shadow, and the label/chevron switch to dark ink. The Google/Yelp pill keeps its white face but gains a real grey hairline border plus shadow so it separates from the page.
- The same rule is applied to the featured (large) link style and to the standalone icon buttons such as Directions, so a lone icon circle always sits on a surface that reads against the page.

Nothing about layout, spacing, radius, icons, or copy changes — only the surface, border and text colors, and only when the background is light.

## Also: undo the last change

The previous turn made the floating Save contact / Share chips solid dark pills. That was not what was asked for. Those revert to their prior translucent style.

## Technical notes

- `src/lib/hubContrast.ts`: revert `chipClass` / `chipIconClass` to the previous translucent values. Add a `blockClass`, `blockTextColor` and `blockMutedClass` to `HubContrast` so all three surfaces share one definition of a readable block.
- `src/pages/personal/PersonalProfilePage.tsx` (`LinkCard`, ~lines 229-291): replace the hardcoded `bg-white/10 … text-white` and `border-white/20` strings with the resolved block classes. `LinkCard` currently has no background awareness, so pass the resolved contrast down from the page (it is already computed at ~line 1286) rather than recomputing per card. Same treatment for the featured branch and the icon-only link button.
- `src/components/personal/ProfilePreviewRenderer.tsx`: mirror the same block classes so the dashboard preview matches the live hub.

## Verification

- Mariscos Las Nuevas Islas (white background, Logo header): review / Yelp / Directions blocks clearly bounded and legible on a 390px phone.
- Reborn Wraps, Xol Coffee and other dark-background hubs render identical to today.
- Dashboard preview matches the live hub for both a light and a dark hub.
