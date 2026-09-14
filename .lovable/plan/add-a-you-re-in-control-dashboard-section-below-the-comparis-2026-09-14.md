# Add a "You're in Control" dashboard section below the comparison table

## Scope

Insert a new homepage section immediately after the consolidated comparison table and before the existing "How It Works" section. The section should match the supplied reference: editorial left text, bullet checklist, and a right-side phone-frame dashboard mockup with small annotation pointers calling out things the owner can do in the dashboard.

## Visual composition

- Full-width section on `bg-background` with `px-4 py-12 md:py-16`.
- Eyebrow: cyan/primary uppercase tracking text, "YOU'RE IN CONTROL".
- Headline: "Your hub updates as fast as your business does." in large bold `text-foreground`.
- Supporting paragraph: "Raised your prices? Added a new service? Running a weekend promo? Update it once in your dashboard and every card out in the wild updates instantly."
- Two-column layout on desktop (text left, mockup right), single column on mobile.
- Left column bullet list with cyan `Check` icons:
  - Edit links, photos, and promos from your phone
  - Changes go live instantly on every card
  - No reprints, no new codes, no extra cost
- Right column: a generic, code-built phone-frame dashboard mockup (no real customer data).
  - Rounded phone bezel/frame using existing border/background tokens.
  - Inner dashboard cards similar to the current dashboard UI: status header, "Your hub is live", "First visit!", "First review click", etc. using sample/placeholder copy.
  - Small numbered annotation dots or short callout labels pointing to specific cards/features (e.g., 1. Live hub status, 2. Visitor notifications, 3. Review alerts).
  - Caption beneath the phone: "Your TapAway dashboard" in muted text.

## Responsive behavior

- Desktop: text and bullets on the left ~45-50% width, mockup on the right.
- Tablet/mobile: stack vertically, mockup centered or full-width below the text.
- Keep all annotation labels readable; on very small screens, collapse pointer labels into a compact legend or hide numbers and show only connected labels.

## Technical changes

1. Create a new component `src/components/landing/DashboardControlSection.tsx`.
2. Use `framer-motion` `useInView` for entrance animations consistent with nearby sections (fade up, staggered bullets and mockup).
3. Build the dashboard mockup entirely in JSX/Tailwind; no customer screenshots or real hub data.
4. Import and render `<DashboardControlSection />` in `src/pages/Index.tsx` directly after `<ComparisonSection />` and before `<HowItWorksNew />`.
5. Use existing semantic tokens only (`text-primary`, `bg-card`, `border-border`, `text-muted-foreground`, etc.); no hardcoded color utilities.
6. Remove or do not import any new external assets; icons come from `lucide-react`.

## Verification

- Confirm the section renders under the comparison table and above How It Works.
- Confirm desktop and mobile layouts via Playwright screenshots.
- Confirm bullets, headline, and annotations appear as intended.
- Run `bunx eslint` and `bunx tsgo --noEmit` with no new errors.
