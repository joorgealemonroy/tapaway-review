# Real hub previews in the homepage phone

## Goal
Show the actual matching public hub inside the phone beside each printed card, using each hub's real branding, images, layout, labels, and content rather than the current simplified white preview.

## Implementation
1. **Load the complete live hub data**
   - Fetch the selected profile, active links, and active content blocks through the same public data path used by the live hub.
   - Preserve each hub's background, banner or logo treatment, text colors, button style, cover images, grid layout, labels, and ordering.
   - Keep the exact card-to-hub mapping for Hideaway Pacific Beach, Paperboy Roasting Company, Fish Hook Seafood, and Tutti Mangia Italian Chophouse.

2. **Create a phone-safe live hub renderer**
   - Reuse the existing hub rendering patterns inside the existing phone frame.
   - Render a fixed-width mobile hub canvas and scale it uniformly into the phone screen so text, image cards, pills, and spacing retain their real proportions.
   - Show only the initial phone viewport instead of shrinking the entire long page.
   - Keep the homepage preview isolated so it does not track visits, open dialogs, show account-state banners, or alter the real public hub.

3. **Keep card and hub synchronized**
   - Preload the selected hub's visible images together with its front and back card artwork.
   - Keep the current pair visible until the next card and matching hub are ready.
   - Preserve automatic switching, manual previous/next selection, card drag, pause/play, reduced motion, loading fallbacks, and the working live-hub link.

4. **Verify the four matched pairs**
   - Check desktop, 390px, and 360px layouts.
   - Confirm each card displays beside the correct live hub and that the preview matches the real hub's first viewport.
   - Confirm several automatic and manual transitions never mix businesses.
   - Check image loading, phone clipping, touch targets, horizontal overflow, links, and browser errors.

## Technical notes
- Extend the showcase preview data shape from the current name/logo/four-action summary to the existing full profile, links, and blocks shape.
- Adapt the existing profile preview renderer for a compact, non-interactive homepage mode rather than embedding the public page or duplicating its visual rules.
- No database schema or admin-management changes are required.
