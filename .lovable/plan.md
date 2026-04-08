

# Replace Mockups with Live Iframes on /examples

## What changes

Replace the fake phone mockups on the Examples page with live iframes of real TapAway pages, with static fallbacks if they fail to load.

- **Restaurant tab**: Iframe loads `/lasislassalem` (Las Islas – Salem, a restaurant hub)
- **Small Business tab**: Iframe loads `/rebornwraps` (Reborn Wraps, a personal profile)

### Implementation

**`src/pages/Examples.tsx`** — Major rewrite:

1. **Remove** the `MockButton` component, `sampleMenu` data, and the menu `Dialog` modal — the real pages handle all of that
2. **Add** a `LivePhoneFrame` component that:
   - Renders an `<iframe src="/{slug}">` inside the phone bezel
   - Shows a loading spinner while the iframe loads
   - Uses `onLoad`/`onError` + a 5-second timeout to detect failures
   - If the iframe fails, swaps to a static fallback (the existing mockup buttons as they are now)
3. **Update** the feature callouts to reference the real business names:
   - Restaurant callouts reference "Las Islas" instead of "Maria's Taqueria"
   - Small Business callouts reference "Reborn Wraps" (already correct)
4. **Keep** the accordion, CTA section, sticky call bar, and page structure unchanged

### Iframe sizing
- Phone frame stays at 280–300px wide
- Iframe fills the frame with `width: 100%; height: 100%; border: none`
- `pointer-events: auto` so visitors can interact with the real page inside the frame

## Files modified
1. `src/pages/Examples.tsx` — Replace mockup content with live iframes + fallback logic, update business names

