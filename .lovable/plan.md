

# Add More Button Themes + Improve Theme Picker UX

## Current State
5 themes exist (glass, filled, outline, soft, shadow) with realistic Instagram/X pill previews in the Design tab. The renderer in `ProfilePreviewRenderer.tsx` applies theme-specific CSS.

## Plan

### 1. Add 5 New Button Themes
Expand `BUTTON_THEMES` array and add matching cases in the renderer:

| Theme ID | Visual | Description |
|----------|--------|-------------|
| `neon` | Glowing colored border, dark pill | Colored glow effect around the pill |
| `gradient` | Gradient fill using headerColor | Smooth gradient from headerColor to a lighter shade |
| `minimal` | Text-only, no background, underline on hover | Clean, no-chrome style |
| `rounded-filled` | Like filled but fully rounded (pill shape) | Solid color, rounded-full |
| `brutalist` | Hard black border, no radius, bold text | Blocky, high-contrast look |

### 2. Organize Themes into Categories
Group the 10 themes into collapsible sections or a scrollable list to prevent the picker from becoming overwhelming:
- **Classic**: Glass, Filled, Outline, Soft, Shadow
- **Bold**: Neon, Gradient, Rounded Filled, Brutalist, Minimal

### 3. File Changes

**`DashboardDesignTab.tsx`**:
- Add 5 new entries to `BUTTON_THEMES` with labels/descriptions
- Add `getPillStyle` and `getPillTextColor` cases for each new theme
- Group themes with small category headers ("Classic" / "Bold")

**`ProfilePreviewRenderer.tsx`** (lines 437-480):
- Add 5 new cases to the `themeClasses` switch for: `neon`, `gradient`, `minimal`, `rounded-filled`, `brutalist`
- Each case defines: pill className, pillStyle, showIcon, labelClass, arrowClass

### 4. Ensure Fast Hub Updates
The current flow already calls `onUpdate({ buttonTheme })` immediately on click, which triggers a live preview update. The save-to-DB happens through the existing pending state + save mechanism. No changes needed for speed — the preview is already instant. The live profile (`PersonalProfilePage`) reads `button_theme` from the database, which updates on save.

### Technical Notes
- No database changes needed — `button_theme` is already a `text` column, so any string value works
- The preview panel updates instantly via React state (no network round-trip needed for preview)
- Only the 5 new switch cases in the renderer + 5 new theme definitions in the design tab

