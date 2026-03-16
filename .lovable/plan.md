

# Vibe-Synced Identity Step

## Changes

### 1. `src/components/personal/signup/ClaimStep.tsx` — Major UI upgrade
- **Vibe glow background**: On mount, read `tapaway_selected_vibe` from sessionStorage (before it's cleared by PersonalSignup). Store the vibe's `glowColor` and `name` in local state. Render a full-page radial gradient overlay using that color at ~15% opacity.
- **"← Change Vibe" button**: Top-left ghost button with low-opacity text. Navigates to `/personal/vibe` and clears `tapaway_selected_vibe` from sessionStorage.
- **Vibe label**: Small muted text above the title: `Selected Style: [Vibe Name]`.
- **Cycling placeholder**: Use a `useEffect` interval that rotates the username input placeholder through `["artist", "founder", "creator", "vlogger"]` every 2 seconds.
- **Accent-colored validation**: When `usernameStatus === "available"`, apply a one-time border pulse using the vibe's `accentColor` (CSS animation). The "Available!" micro-win text uses the vibe's accent instead of hardcoded green.
- **OAuth buttons**: Set to `w-full` matching the username input width (already the case, but ensure `h-14` matches the input height for stacked alignment).
- **Vertical centering on mobile**: Wrap content in `min-h-[calc(100vh-120px)] flex flex-col justify-center` to avoid bottom-heavy layout.

### 2. `src/pages/personal/PersonalSignup.tsx` — Pass vibe data to ClaimStep
- The vibe is currently consumed and cleared from sessionStorage in an effect. Before clearing, store the vibe's `glowColor`, `name`, and `accentColor` in component state (`vibeMetadata`).
- Pass `vibeMetadata` as a new prop to `ClaimStep`.
- The vibe template data (links, blocks, colors) is already being saved to onboarding state and persisted to the profile during checkout — no additional "save logic" changes needed since `bgColor`, `headerColor`, and `backgroundColor` are already mapped from the template's `style` object in the existing vibe consumption effect.

### 3. `src/lib/vibeTemplates.ts` — No changes needed
The `glowColor` and `mockupTheme.accent` fields already exist on all templates.

## Technical notes
- The vibe accent color for the input pulse will use a CSS `@keyframes` animation injected via inline style or a Tailwind `animate-` class with a custom keyframe in `index.css`.
- The cycling placeholder uses `useState` + `setInterval` with cleanup.
- No database changes — vibe style fields are already persisted via the existing onboarding flow.

