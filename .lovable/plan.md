

# Identity UI Overhaul & Rebrand

## 1. Global Rebranding — `src/lib/vibeTemplates.ts`

Rename all six templates (IDs and display names):

| Old ID | Old Name | New ID | New Name | Subtitle (keep) |
|--------|----------|--------|----------|-----------------|
| artemis | Artemis | pure | Pure | Minimalist |
| balcombe | Balcombe | organic | Organic | Botanical |
| boultont | Boultont | obsidian | Obsidian | Premium |
| cyber | Cyber | neon | Neon | Neon Glow |
| editorial | Editorial | vogue | Vogue | Classic & Elegant |
| corporate | Corporate | elevate | Elevate | Professional |

No other files reference old IDs directly — the vibe ID is stored in sessionStorage at runtime, so this is a clean swap.

## 2. Layout Compression — `src/components/personal/signup/ClaimStep.tsx`

- Remove `min-h-[calc(100vh-120px)] flex flex-col justify-center` wrapper — replace with a tighter `pt-2` top-aligned layout inside a `max-w-[400px] mx-auto` container.
- Move "← Change Vibe" and "Selected Style: Pure" into a single inline row at the top (below progress bar), using `text-xs opacity-60`.
- Remove the `space-y-6` gap; tighten to `space-y-4`.
- Title "Create your TapAway" moves immediately below the vibe indicator row.

## 3. Cycling Placeholders — `ClaimStep.tsx`

- Change array from `["artist", "founder", "creator", "vlogger"]` to `["paul", "sarah", "justin", "blake", "maya", "jake"]`.
- Change interval from 2000ms to 1500ms.
- Wrap the placeholder in an `AnimatePresence` cross-fade by keying on `placeholderIdx` (use framer-motion's `mode="wait"` on a visually hidden label, or simply apply a CSS `transition: opacity 0.2s` by toggling a fade class on each change).

## 4. Auth Buttons Reveal Animation — `ClaimStep.tsx`

The auth buttons section already uses `AnimatePresence` with `usernameReady` gating. Enhance the motion:
- Change `initial` from `{ opacity: 0, y: 10 }` to `{ opacity: 0, y: 20 }`.
- Add `transition: { type: "spring", stiffness: 300, damping: 25 }` for a smoother slide-up feel.

## 5. Input Glow — `ClaimStep.tsx`

Add a persistent subtle `box-shadow` on the username input using the vibe's `glowColor` (not accent) at ~20% opacity: `0 0 20px ${glowColor}33`. This is always-on, separate from the pulse animation on availability.

## Files
- **Edit**: `src/lib/vibeTemplates.ts` (rename IDs and names)
- **Edit**: `src/components/personal/signup/ClaimStep.tsx` (layout, placeholders, glow, animation)

No database changes needed.

