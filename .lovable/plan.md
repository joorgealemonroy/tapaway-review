

# Fix TrialBanner / MobileNav Overlap

## Problem
`TrialBanner` is `fixed top-0 z-50` and `MobileNav` is `sticky top-0 z-50`. They fight for the same space — the banner is hidden behind the nav, with only its bottom edge visible as a thin blue bar.

## Solution
Make the `MobileNav` aware of the banner by pushing it down when the banner is visible, OR (simpler and cleaner) increase the `TrialBanner` z-index to `z-[60]` and add `top-14` offset on mobile so it sits **below** the nav instead of behind it.

**Recommended approach**: Change `TrialBanner` to render below the nav on mobile:
- Add `top-14 md:top-0` to position it beneath the 56px mobile nav
- Bump z-index to `z-[60]` so it layers correctly on desktop where nav is different

## File modified
- `src/components/TrialBanner.tsx` — adjust positioning classes

