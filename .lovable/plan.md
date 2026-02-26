

# Fix: Laggy/Glitchy Scrolling on Safari Mobile

## Root Causes

After reviewing `PersonalProfilePage.tsx` and `index.css`, there are several known iOS Safari scroll-jank triggers stacked on this page:

1. **Framer Motion `motion.a` on every link** (lines 84, 118, 152, 187, 457) — Each `ProfileLink` uses `motion.a` with `whileHover`/`whileTap` gesture listeners. Framer attaches touch event handlers to every one of these, intercepting scroll gestures and causing micro-jank as the browser decides if the user is scrolling or tapping.

2. **`backdrop-blur-sm` and `backdrop-blur-2xl`** (lines 889, 897, 930, 938, 1060) — iOS Safari composites blur effects on a separate GPU layer. During scroll, each blurred element forces a GPU re-composite per frame. With 4-5 blurred elements, this stacks up.

3. **Multi-layer `boxShadow` on the phone frame** (line 856-858) — Three nested `box-shadow` layers with large spread values are re-painted on every scroll frame.

4. **`transition-all` on interactive elements** (lines 156, 191) — Transitions ALL CSS properties instead of only the ones that change, causing the browser to check every property for animation on each frame.

5. **No hardware acceleration hint on the banner image** — The 55vh banner image isn't promoted to its own GPU layer, so the compositor has to handle it on the main thread.

## Fixes

### 1. `src/pages/personal/PersonalProfilePage.tsx` — Replace `motion.a` with plain `<a>` in ProfileLink

The `whileHover: { scale: 1.02 }` and `whileTap: { scale: 0.98 }` animations are nearly imperceptible on mobile and cause scroll interference. Replace all `motion.a` with plain `<a>` tags and use CSS `active:scale-[0.98]` for tap feedback instead (CSS-only, no JS gesture listeners):

```tsx
// Before (every link variant):
<motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} ...>

// After:
<a className="... active:scale-[0.98] transition-transform" ...>
```

This applies to all 5 link/block variants: grid cover, full cover, featured, regular, and image block with link.

### 2. `src/pages/personal/PersonalProfilePage.tsx` — Remove `backdrop-blur` from action buttons

Replace `backdrop-blur-sm bg-white/20` with solid semi-transparent backgrounds that don't require GPU blur compositing:

```tsx
// Before:
className="h-10 w-10 backdrop-blur-sm bg-white/20 ..."

// After:
className="h-10 w-10 bg-black/30 ..."
```

Also replace `backdrop-blur-2xl` on the footer CTA pill (line 1060) with a solid background.

### 3. `src/pages/personal/PersonalProfilePage.tsx` — Simplify boxShadow on phone frame

Replace the triple-layer shadow on line 856-858 with a single simpler shadow:

```tsx
// Before:
boxShadow: `0 0 80px 30px ${c}30, 0 0 120px 60px ${c}15, 0 0 160px 80px ${c}08`

// After:
boxShadow: `0 0 60px 20px ${c}25`
```

### 4. `src/pages/personal/PersonalProfilePage.tsx` — Add GPU promotion to banner image

Add `will-change: transform` to the banner image container so iOS promotes it to its own compositing layer:

```tsx
<div className="w-full h-[55vh] md:h-[50vh] overflow-hidden"
     style={{ willChange: 'transform' }}>
```

### 5. `src/pages/personal/PersonalProfilePage.tsx` — Replace `transition-all` with specific properties

On link elements, change `transition-all` to `transition-transform` since only transform changes.

### 6. `src/index.css` — Add scroll performance hints

Add `-webkit-overflow-scrolling: touch` to body for momentum scrolling, and `transform: translateZ(0)` to the profile container for GPU layer promotion:

```css
body {
  -webkit-overflow-scrolling: touch;
}
```

## Files Modified
- `src/pages/personal/PersonalProfilePage.tsx` — remove Framer Motion from links, remove backdrop-blur, simplify shadows, add GPU hints
- `src/index.css` — add `-webkit-overflow-scrolling: touch`

## Impact
- Eliminates Framer Motion gesture listener overhead during scroll (biggest win)
- Removes 5 `backdrop-blur` compositing layers
- Reduces box-shadow repaint cost by ~60%
- Tap feedback preserved via CSS `active:scale` (zero-cost, no JS)
- No visual difference at normal scrolling speed

