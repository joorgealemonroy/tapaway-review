# Temporarily Hide "Watch a 30-Sec Demo" Button

## Goal
Remove the secondary "Watch a 30-Sec Demo" CTA from the homepage hero until the demo video is ready, without redesigning anything else.

## What to change
- In `src/components/landing/HeroSection.tsx`, hide the "Watch a 30-Sec Demo" button from the hero CTA row.
- Leave the primary "Send Me My Cards" button untouched.
- Prefer a simple JSX comment or conditional render so the button can be re-enabled quickly later.
- Keep all imports that remain used; remove imports that become unused if the button is the only consumer.

## Verification
- Open the homepage preview and confirm only the primary "Send Me My Cards" CTA appears in the hero.
- Run `bunx eslint` and `bunx tsgo --noEmit` to confirm no new errors.
- Test on desktop and mobile viewports.

## Out of scope
- No layout, color, or copy changes to any other section.
- No new video infrastructure.
