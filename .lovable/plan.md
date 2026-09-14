# Consolidate the homepage comparisons

## Scope

Replace the two separate homepage sections, “Why TapAway Beats One-Time NFC Products” and “Why TapAway Beats QR Codes,” with one compact comparison section based on the supplied reference. Keep the rest of the homepage unchanged.

## New section

- Use the heading “Why businesses switch to TapAway.”
- Add the supporting copy from the reference explaining the contrast with one-time plates and QR codes.
- Build one responsive comparison table with columns for the benefit, TapAway, One-Time Plate, and QR Code.
- Highlight the TapAway column with the existing cyan brand treatment while keeping the other columns subdued.
- Include these rows:
  - Try it before you pay — TapAway: ✓ 14 days free; others: ✗
  - We set it all up for you — TapAway: ✓; others: ✗
  - Every tap + review tracked — TapAway: ✓; others: ✗
  - Instagram, menu, booking in one place — TapAway: ✓; One-Time Plate: ✗ reviews only; QR Code: ✗ one link
  - A human when you need help — TapAway: ✓; others: ✗
  - Edit your hub anytime — TapAway: ✓; others: ✗
  - Cost to start — TapAway: ✓ $0; others: ✗
- Keep the NFC compatibility and QR-backup note beneath the table.
- Preserve the existing entrance animation with restrained row reveals.

## Responsive behavior

- Keep the full side-by-side table on desktop.
- On smaller screens, retain all three product comparisons in a horizontally scrollable table with clear column headers, rather than dropping any information.
- Prevent clipped labels, overlapping text, and page-level horizontal overflow.

## Technical changes

- Rework the existing comparison component into the consolidated table.
- Remove the separate QR comparison component from the homepage render so the comparison appears only once.
- Use existing semantic color and typography tokens; the uploaded image is a layout reference only and will not be embedded.

## Verification

- Confirm both old headings and both old card layouts are gone.
- Confirm the new section appears once and includes all seven rows, including “Edit your hub anytime.”
- Check desktop and mobile layouts in the live preview.
- Run TypeScript and lint checks with no new errors or warnings.
