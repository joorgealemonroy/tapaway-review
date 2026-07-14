## Mobile Hero Redesign

### Goal
Tighten the mobile hero layout and add a product visual + trust signal to improve conversion.

### Changes

1. **Tighten top spacing**
   - Reduce vertical padding/margin between the sticky mobile navbar and the "Trusted by" badge in `HeroSection.tsx`.
   - Keep desktop spacing unchanged.

2. **Add NFC card visual below headline**
   - Render `TapAwayCard3D` directly under the `<h1>` on mobile only.
   - Scale the card for mobile (smaller than the desktop hero visual, centered, no perspective tilt).
   - Hide the existing right-column card visual on mobile (it already is `hidden lg:block`, so this is mostly confirming behavior).

3. **Shorten subheadline**
   - Replace current subheadline copy with a two-line version focused on "Zero setup. $0 Today."
   - Suggested copy: "Grow your presence with branded NFC Cards. Collect reviews effortlessly. Zero setup. $0 Today."

4. **Add trust text under CTA**
   - Insert small, centered text directly below the "Send Me My Cards" button.
   - Copy: "Pay $0 today. Cancel anytime."

### Files to edit
- `src/components/landing/HeroSection.tsx`
- `src/components/TapAwayCard3D.tsx` (minor mobile sizing tweak if needed)

### Out of scope
- No backend or routing changes.
- No desktop layout changes beyond the card visual appearing on mobile.