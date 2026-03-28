

# Pixel-Perfect Card Front Redesign

## Summary
Refactor the `CardFront` component in `CardCustomizer.tsx` to match the target design with precise proportions, a dominant logo circle, properly weighted typography, and bold bottom icons.

## Changes to `src/components/onboarding/CardCustomizer.tsx`

### CardFront rewrite

**Container:**
- Replace inline `width`/`aspectRatio` style with `w-full max-w-[320px] aspect-[54/86] bg-white rounded-2xl shadow-lg border border-gray-200`
- Inner content: `flex flex-col items-center justify-between h-full text-center p-6`
- Keep the 3D perspective transform

**Top Section (Stars & Text):**
- Stars: `w-6 h-6` each, `fill-yellow-400 text-yellow-400`, container `flex space-x-1`
- Headline: `text-lg font-normal text-gray-800 leading-snug mt-3` — remove `font-semibold`
- Sub-headline: `text-sm font-normal text-gray-800 mt-1` — change from `text-slate-500 text-[9px]`

**Center Logo Circle:**
- Increase from `w-[55%]` to a dominant `w-48 h-48` with `bg-[#707070]` (darker grey)
- Add `my-auto flex-shrink-0`
- Placeholder text: `text-white font-black text-3xl leading-none tracking-tight` showing YOUR / LOGO / HERE

**Bottom Icons Section:**
- Container: `flex items-center justify-center w-full h-16 mb-4`
- NFC icon: Replace the small Smartphone+circle combo with larger `Smartphone` + `Wifi` icons at `w-16 h-16`, colored `text-black`
- Divider: `h-full w-px bg-black mx-4` (darker, taller)
- QR icon: `QrCode` at `w-16 h-16 text-black`

**Footer:**
- `font-black text-xs text-black pb-2 tracking-wide` — bolder and darker

### CardBack — minor alignment
- Match the larger logo circle style (`w-36 h-36 bg-[#707070]`) for consistency
- Same darker footer styling

## File modified
1. `src/components/onboarding/CardCustomizer.tsx`

