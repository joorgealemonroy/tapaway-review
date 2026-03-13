

# Add Missing Colors to Background Presets

The "Background" section (`BG_PRESETS`) currently only has 8 colors (whites, darks, warm yellow, mint). It's missing all the feminine/colorful colors that are already in the header's `COLOR_PRESETS`.

## Change — `src/components/personal/DashboardDesignTab.tsx` (line 58)

Update `BG_PRESETS` to include the soft/feminine colors:

```typescript
const BG_PRESETS = [
  "#ffffff", "#f5f5f5", "#fafafa", "#1a1a1a", "#0a0a0a", "#1e293b",
  "#fef3c7", "#ecfdf5",
  "#F8C8DC", "#FFB6C1", "#DDA0DD", "#E8B4BC",
  "#B5EAD7", "#FFDAC1", "#C3B1E1",
];
```

Adds 7 colors: soft pink, light pink, plum, dusty rose, sage green, peach, soft purple. One line change, no other files affected.

