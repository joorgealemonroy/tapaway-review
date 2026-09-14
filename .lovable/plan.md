# Replace "Try TapAway Risk-Free" Section

## Goal
Replace the existing `RiskReversalSection` on the homepage with a dark, two-column "Start Free" section matching the uploaded reference image, using the uploaded SVG as the right-side product mockup image.

## What Will Change
- `src/components/landing/RiskReversalSection.tsx`: full rewrite to match the reference layout and content.
- `src/assets/tapaway-card-mockup.svg.asset.json`: new CDN pointer for the uploaded SVG (created via `lovable-assets`).

## What Will Stay the Same
- Section position on the page: remains directly after `HowItWorksNew` and before `FAQSection` in `src/pages/Index.tsx`.
- CTA destination: `/start`.
- Copy closely mirrors the reference: "START FREE" eyebrow, "Your first 14 days are on us.", three cyan-check bullets, and the fine-print disclaimer.

## Implementation Details

### Asset Handling
1. Upload the user-supplied SVG (`Copy_of_Gray_and_Black_Minimalist_Digital_Mockup_Instagram_Story.svg`) to the Lovable CDN using `lovable-assets create --file /mnt/user-uploads/Copy_of_Gray_and_Black_Minimalist_Digital_Mockup_Instagram_Story.svg --filename tapaway-card-mockup.svg`.
2. Write the resulting JSON pointer to `src/assets/tapaway-card-mockup.svg.asset.json`.
3. Import the pointer in `RiskReversalSection.tsx` and render it via `<img src={mockupAsset.url} alt="TapAway NFC card mockup showing Sugar Bloom Cakery & Coffee review card" />`.
4. Note: the uploaded SVG is ~4.6 MB. If the build or preview shows performance issues, we can revisit compression or a raster fallback, but the plan will use the SVG verbatim as requested.

### Section Layout
- Full-width dark surface (`bg-[#0a0f1c]` or the closest existing token that matches the reference; the reference is a very dark navy, so an explicit dark value is required).
- Container: `max-w-7xl mx-auto px-4 py-16 md:py-24`.
- Two-column grid on desktop: left text (~55%), right image (~45%), vertically centered.
- Stack vertically on mobile: text first, image second.

### Left Column
- Small uppercase eyebrow: "START FREE" in cyan (`text-primary`).
- Heading: "Your first 14 days are on us." in large white bold text.
- Subheading: "4 custom cards with your logo, your hub built for you, and the full dashboard — free for 14 days."
- Bullet list with cyan checkmarks:
  - "Cards designed, printed & shipped to you"
  - "Your hub built and live within days"
  - "No charge until day 14 — cancel anytime"
- CTA button: white pill button with black text and arrow icon, linking to `/start`.
- Fine print below the button: "Card on file required · $1 hold, voided instantly · Cancel anytime."

### Right Column
- Render the uploaded SVG mockup image within a rounded container (`rounded-2xl` / `rounded-3xl`) so it matches the card mockup framing in the reference.
- Use `object-contain` and constrain max width so it does not dominate the section.
- Provide alt text for accessibility.

### Animation
- Preserve a subtle entrance animation using `framer-motion` `useInView`, consistent with the current component.

## Verification
- Run `bunx eslint` on the changed file.
- Run `bunx tsgo --noEmit`.
- Use Playwright to capture desktop and mobile screenshots of the homepage, confirming:
  - The old "Try TapAway Risk-Free" heading no longer appears.
  - The new "Your first 14 days are on us." heading and SVG mockup are visible.
  - The layout is responsive with no horizontal overflow.
