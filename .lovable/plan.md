

# Fix Card Preview Sizing, Alignment & Typography

## Problem
The Front card uses hardcoded `w-[300px] sm:w-[320px]` while the Back card uses `w-full max-w-[320px]`, causing size mismatch. The preview container uses a basic flex layout instead of a proper grid. Typography lacks `tracking-tight` for a modern feel.

## Changes to `src/components/onboarding/CardCustomizer.tsx`

### 1. Unified card sizing (both Front & Back)
Both cards get identical container classes:
```
w-full max-w-[280px] aspect-[54/86] bg-white rounded-2xl shadow-xl flex flex-col relative overflow-hidden
```
- **CardFront** (line 22): Remove `w-[300px] sm:w-[320px] rounded-[24px] shadow-2xl border border-gray-100`, replace with unified classes. Keep `p-6 items-center text-center` and the 3D transform style.
- **CardBack** (line 92): Remove `max-w-[320px] shadow-lg border border-gray-200`, replace with unified classes. Keep the 3D transform style.

### 2. Grid container for previews (lines 153–162)
Replace the `flex flex-col sm:flex-row items-center justify-center gap-6` wrapper with:
```
grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mx-auto justify-items-center items-center
```

### 3. Typography — add `tracking-tight` and Inter font
- Add `font-['Inter',sans-serif] tracking-tight` to both card containers
- The headline (`text-[17px]`) and sub-headline (`text-[15px]`) already use `font-normal` — just ensure `tracking-tight` cascades
- Logo circle proportions scale down slightly from `w-[200px] h-[200px]` to `w-[160px] h-[160px]` to fit the smaller 280px card, with text adjusted to `text-[28px]`

### 4. Logo circle on Back card
Scale up from `w-36 h-36` to `w-[130px] h-[130px]` to better match front proportions

## File modified
1. `src/components/onboarding/CardCustomizer.tsx`

