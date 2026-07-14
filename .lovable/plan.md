Rewrite `src/pages/OnboardingSuccess.tsx` as an ultra-minimalist post-checkout success screen.

## Changes

1. **Layout**
   - Keep root `min-h-screen bg-[#0a0e1a] text-white`.
   - Move `TapAway` wordmark to absolute top-left with standard onboarding padding (`px-6 py-4`).
   - Center remaining content vertically and horizontally with `max-w-md mx-auto px-6` and generous vertical breathing room.

2. **Visual elements**
   - Remove concierge pill, Sparkles icon, and glow effects.
   - Add a single `Check` icon from `lucide-react` inside a subtle circle: `bg-[#111827]`, thin border (`border-white/10` or similar), white or light-blue icon. No neon glow.

3. **Typography**
   - H1: `"You're in. We'll handle the rest."` — bold, white, centered.
   - Subheadline: `"Our team is building your custom profile. We'll text you to review it shortly."` — centered, muted gray/blue.

4. **Remove checklist**
   - Delete the `"What Happens Next"` section and `STEPS` array entirely.

5. **Primary button**
   - Centered, standard-width primary blue button (`bg-blue-600`, no shadow glow).
   - Label: `"Go to Dashboard"`.
   - `onClick={() => navigate("/dashboard")}`.

6. **Preserve**
   - Confetti effect on mount.
   - `window.scrollTo(0, 0)` on mount.
   - Existing imports/routing behavior.

## Verification

- Run TypeScript typecheck (`bunx tsgo`).
- Capture mobile (390×844) and desktop screenshots to confirm top-left wordmark, centered content, clean checkmark circle, no checklist, and proper spacing.

## Out of scope

No database changes, no routing changes, no edits to other files.