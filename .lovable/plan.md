

# Default Black Background/Pills + More Colorful Presets

## 1. Default black background & pill colors for new accounts

Change default `backgroundColor` from `#ffffff` to `#000000` and default `pill_color` from `null` to `#000000` across all creation paths:

| File | Change |
|------|--------|
| `supabase/functions/create-personal-account/index.ts` (line 97) | `backgroundColor = "#ffffff"` → `"#000000"` |
| `supabase/functions/create-personal-account/index.ts` (line 202) | `pill_color: link.pillColor \|\| null` → `\|\| "#000000"` |
| `src/hooks/usePersonalOnboarding.ts` (line 70) | `backgroundColor: "#ffffff"` → `"#000000"` |
| `src/pages/personal/PersonalSignupComplete.tsx` (line 229) | fallback `"#ffffff"` → `"#000000"` |
| `src/pages/personal/PersonalSignupComplete.tsx` (line 263) | `pill_color: link.pillColor \|\| null` → `\|\| "#000000"` |
| `src/components/personal/signup/CheckoutStep.tsx` (lines 491, 529, 716, 742, 1030) | fallback `"#000000"` already set for bg; change `pill_color` fallbacks from `null` to `"#000000"` |
| `src/pages/admin/AdminPersonalAccounts.tsx` (lines 138, 184, 508) | `backgroundColor: "#ffffff"` → `"#000000"` |
| `src/components/personal/signup/AffiliatePaywall.tsx` (line 83) | `backgroundColor: "#ffffff"` → `"#000000"` |

## 2. Add colorful/feminine colors to background presets

Expand `COLOR_PRESETS` in three files to include soft pink, rose, blush, lavender, and other feminine tones:

**New palette** (replacing the current 8-color list):
```
"#000000", "#FFFFFF", "#1a1a2e", "#2d6a4f",
"#e63946", "#4361ee", "#f4a261", "#9b5de5",
"#F8C8DC", "#FFB6C1", "#DDA0DD", "#E8B4BC",
"#B5EAD7", "#FFDAC1", "#C3B1E1"
```

Adds: soft pink, light pink, plum, dusty rose, sage green, peach, soft purple.

Updated in:
- `src/components/personal/DashboardDesignTab.tsx` (line 42)
- `src/components/personal/HeaderCustomizer.tsx` (line 23)
- `src/pages/admin/AdminPersonalAccounts.tsx` (line 94)

