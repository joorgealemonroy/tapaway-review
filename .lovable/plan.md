

# Improved Color Palette for Design Section

## What's Changing
The current color selection in the Design tab has separate "Solid Colors" and "Gradients" sections with small unlabeled circles that users find confusing. We'll replace this with a cleaner, more intuitive color palette that combines everything into one easy-to-scan grid with clear labels, and adds fade/pastel color options for more variety.

## Changes

**File:** `src/components/personal/DashboardDesignTab.tsx`

### 1. Revamp the Color Presets
Replace the current 8 solid colors and 6 gradients with a more curated, compact palette organized into labeled groups:

- **Popular** (6 colors): Black, White, Navy, Forest Green, Coral, Sky Blue
- **Fades** (6 new gradient options): Soft pastel fades like blush-to-peach, lavender-to-blue, mint-to-teal, sunset orange-to-pink, grey fade, and cool blue fade
- Keep the custom hex input + native color picker at the bottom

### 2. Revamp the Background Presets
Same treatment for the background section -- keep the 6 presets but add a few soft fade options and the hex input.

### 3. UI Improvements
- Add clear section labels ("Popular", "Fades") above each row so users know what they're picking
- Keep the color circles but make them slightly larger for easier tapping on mobile
- Keep the hex code input and native color picker for advanced users

### Technical Details

Update the constants at the top of `DashboardDesignTab.tsx`:

```tsx
const COLOR_PRESETS = [
  "#000000", "#FFFFFF", "#1a1a2e", "#2d6a4f",
  "#e63946", "#4361ee", "#f4a261", "#9b5de5",
];

const FADE_PRESETS = [
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",  // Blush to blue
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",  // Lavender
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",  // Cool blue
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",  // Peach
  "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",  // Mint green
  "linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)",  // Soft grey
];
```

Update the header color section (lines ~346-400) to render both groups with labels, and combine into one unified picker with "Solid" and "Fades" sub-labels, plus the hex input below.

Update the background section (lines ~460-522) similarly -- add a few soft background fades alongside the existing flat presets.

No database changes needed -- the existing `header_color` and `background_color` columns already store arbitrary strings (hex or gradient CSS values).
