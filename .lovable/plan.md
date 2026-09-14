# Fix iPhone mockup in "You're in control" section

Scope: `src/components/landing/DashboardControlSection.tsx` only.

## 1. Shrink the phone
- Cap the mockup container at ~300–320px wide (`max-w-[310px]`), keeping it as a supporting visual beside the text.
- Keep the titanium frame, 19.5:9 screen ratio, Dynamic Island, side buttons, and home indicator exactly as they are.

## 2. Fill the screen top to bottom
Rebuild the screen content (all sample copy, no real customer data), in this order:
1. TapAway header row (keep).
2. Sample Cafe business row (keep).
3. New 2-column stat row: small cards "Taps this week — 47" and "Review taps — 18".
4. New "Taps" card with a mini 7-bar chart (cyan bars, varying heights, pure divs).
5. TapAway Solo plan status card (keep).
6. "Your hub is live" card (keep).
7. "First visit!" and "First review click" milestone cards (keep).

Tighten card padding/typography slightly so everything fits the screen height with no dead space at the bottom; if needed, reduce gaps so content runs edge to edge.

## 3. Kill the gaps
- Reduce spacing between the phone and the "Your TapAway dashboard" caption to ~16px (`mt-4`).
- Caption first, legend row directly beneath it.

## 4. Annotation dots + legend
- Keep max 4 numbered dots, repositioned onto the new layout, e.g.:
  1. Stats row → "Live stats"
  2. Taps chart → "Tap trends"
  3. Plan status card → "Plan status"
  4. Milestone cards → "Tap & review alerts"
- Update the legend labels to match those four.

## Verification
- Playwright screenshot of the section on desktop (1280px) and mobile (390px): phone ~300px wide, screen filled top to bottom, 4 dots visible, caption/legend tight, no page errors.
- `bunx tsgo --noEmit` and `bunx eslint` clean.
