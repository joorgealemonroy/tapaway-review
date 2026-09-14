# Replace "Try TapAway Risk-Free" Section

## Goal
Replace the existing `RiskReversalSection` on the homepage with a dark, two-column "Start Free" section matching the uploaded reference image, using the uploaded PNG phone-mockup collage as the right-side image.

## What Will Change
- `src/components/landing/RiskReversalSection.tsx`: full rewrite to match the reference layout and content.
- `src/assets/tapaway-phone-mockups.png.asset.json`: new CDN pointer for the uploaded PNG (created via `lovable-assets`).

## What Will Stay the Same
- Section position on the page: remains directly after `HowItWorksNew` and before `FAQSection` in `src/pages/Index.tsx`.
- CTA destination: `/start`.
- Copy closely mirrors the reference: "START FREE" eyebrow, "Your first 14 days are on us.", three cyan-check bullets, and the fine-print disclaimer.

## Implementation Details

### Asset Handling
1. Upload the user-supplied PNG (`Copy_of_Gray_and_Black_Minimalist_Digital_Mockup_Instagram_Story.png`) to the Lovable CDN using `lovable-assets create --file /mnt/user-uploads/Copy_of_Gray_and_Black_Minimalist_Digital_Mockup_Instagram_Story.png --filename tapaway-phone-mockups.png`.
2. Write the resulting JSON pointer to `src/assets/tapaway-phone-mockups.png.asset.json`.
3. Import the pointer in `RiskReversalSection.tsx` and render it via `<img src={mockupsAsset.url} alt="TapAway phone mockups showing example business hubs" />`.

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
- Render the uploaded PNG mockup image. The PNG is a vertical 9:16 collage of three phone mockups, so the right column will use `object-contain` with a constrained height (e.g., `max-h-[520px] md:max-h-[640px]`) so it fits the section without pushing the layout too tall.
- No additional rounded frame is applied because the mockup itself already includes device frames; the image will be centered within its column.
- Provide alt text for accessibility.

### Animation
- Preserve a subtle entrance animation using `framer-motion` `useInView`, consistent with the current component.

## Verification
- Run `bunx eslint` on the changed file.
- Run `bunx tsgo --noEmit`.
- Use Playwright to capture desktop and mobile screenshots of the homepage, confirming:
  - The old "Try TapAway Risk-Free" heading no longer appears.
  - The new "Your first 14 days are on us." heading and PNG mockup are visible.
  - The layout is responsive with no horizontal overflow.
