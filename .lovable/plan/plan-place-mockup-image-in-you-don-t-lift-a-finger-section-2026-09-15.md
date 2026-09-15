# Plan: Place mockup image in "You don't lift a finger" section

## Goal
Keep the original "You / Run your business. / That's the whole list." text and the existing "We" checklist, and place the uploaded phone-and-card mockup image in a spot that looks good on both desktop and mobile.

## Selected direction
Floating mockup integration (v2): mockup sits inside the left "You" panel, below the text, while the right "We" checklist stays unchanged. On mobile the two-column card stacks with the image inside the "You" panel.

## What will change
- `src/components/landing/DoneForYouSection.tsx`
  - Restore the original left-panel copy: "You" label, "Run your business.", "That's the whole list."
  - Add the mockup image beneath that copy in the left panel.
  - Use the existing public asset `/done-for-you-mockup.png` (already copied to `public/`).
  - Keep the existing "We" bullets and "This is infrastructure, not a gadget." footer.
  - Adapt the prototype's light styling to the project's dark theme via semantic tokens (`bg-muted/30`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` for checkmarks).
  - Make the image scale gracefully: full width inside the panel, object-contain, max height caps so it doesn't dominate on mobile.

## Verification
- ESLint and TypeScript pass.
- Playwright screenshots of the section on desktop (1280 px) and mobile (390 px) confirm the text, image, and checklist render without overlap or clipping.

## Out of scope
- No changes to other homepage sections, pricing, plans, or backend.
