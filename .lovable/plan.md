# Match the client overview blocks to the reference

## Scope
- Update the Solo client dashboard overview used by every Solo client account.
- Keep the existing dashboard navigation, dark theme, tabs, data sources, and all sections outside the overview unchanged.
- Use the uploaded screenshots as a visual reference only.

## Overview blocks
- Replace the current live-hub strip with the reference-style live header: live status, “Your hub is taking taps.”, hub URL/location line when available, and Share/View actions.
- Replace the current progress cards with the compact reference hierarchy: a non-scrolling Momentum row, a three-column “The numbers” summary, and one milestone progress bar.
- Keep every number tied to the same real analytics response so weekly, all-time, momentum, and milestone values cannot contradict one another.
- Use clear zero-data states instead of calculating percentages or highlights from missing data.
- Preserve existing milestone celebrations, usage nudges, playbook tips, and feature discovery below these blocks.

## Remove setup
- Delete the entire “Your setup” checklist and its related setup-count logic from the Solo overview.
- Do not replace it with owner tasks because TapAway handles setup for clients.

## Responsive behavior
- Keep all Momentum content inside the viewport with no horizontal carousel or clipped cards.
- Stack and resize the blocks cleanly on phones while preserving the desktop layout.

## Verification
- Check the Fishhook Seafood client overview on desktop and mobile.
- Confirm “Your setup” is gone, no overview block clips horizontally, Share/View work, and displayed counts are internally consistent.
- Run TypeScript and lint checks with no errors or warnings.
