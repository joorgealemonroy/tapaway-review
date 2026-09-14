# Redesign “You Don’t Lift a Finger” section

## Scope

Change only the homepage’s existing “You Don’t Lift a Finger” section to match the supplied reference. Keep all wording, the four service promises, and surrounding homepage sections unchanged.

## Layout and styling

- Replace the centered heading with a left-aligned introduction:
  - “You don’t lift a finger.”
  - “Here’s the deal.”
- Replace the four separate icon tiles with one bordered two-column panel.
- Use the left column for the customer’s role:
  - small “YOU” label
  - “Run your business.”
  - “That’s the whole list.”
- Use the right column for the TapAway role:
  - small “WE” label
  - the existing four promises in a vertical checklist with cyan checkmarks and subtle dividers
- Keep “This is infrastructure, not a gadget.” centered directly beneath the panel.
- Match the reference’s compact spacing, squared editorial composition, dark surfaces, restrained borders, and existing TapAway typography/color tokens.
- On mobile, stack the YOU and WE columns vertically while preserving the divider, hierarchy, and readable spacing.
- Retain the current entrance animation, adjusted to the new grouped layout.

## Verification

- Confirm the desktop section matches the reference’s heading, 2-column panel, checklist, and footer statement.
- Confirm the mobile version stacks cleanly without clipping, overflow, or overlapping text.
- Confirm all four existing promises remain unchanged and no other homepage content is affected.
- Run the existing TypeScript, lint, and browser checks with no new errors or warnings.
