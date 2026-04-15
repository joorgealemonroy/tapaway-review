

# Show Marketing Footer Cards in Dashboard Preview & Admin View

## Problem
The three marketing elements (CTA pill, Examples card, Features card) only render on the public `/socials` profile page. They are not visible in the dashboard phone preview or when an admin views the socials profile via impersonation.

## Solution
Add `MarketingFooterCards` to `ProfilePreviewRenderer.tsx` — the component used by both the dashboard phone mockup and admin impersonation preview. Render it conditionally when `profile.username === 'socials'`, placed after the unified content section and before the closing `</div>`.

## Changes

| File | Change |
|------|--------|
| `src/components/personal/ProfilePreviewRenderer.tsx` | Import `MarketingFooterCards`. After the content section (line ~908), add `{profile.username === 'socials' && <MarketingFooterCards isDarkBg={isDarkBg} />}` before the final closing div. |

This single change covers both the dashboard preview panel and the admin impersonation view since they both render through `ProfilePreviewRenderer`.

