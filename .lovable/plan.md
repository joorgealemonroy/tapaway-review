

# Bloom & Neon Refresh

## 1. Add "Bloom" template to `vibeTemplates.ts`

New entry with feminine aesthetic:
- **id**: `bloom`, **name**: `Bloom`, **subtitle**: `Soft & Feminine`
- **glowColor**: `rgba(255, 143, 171, 0.2)` → use `#FF8FAB` for glow
- **mockupTheme**: bg `#FFF9F8`, text `#5C3D4E`, accent `#FF8FAB`, cardBg `#FDE2E4`, border `#F5C6CB`
- **style**: bgColor `#FFF9F8`, headerColor `#FDE2E4`
- **defaultLinks**: Instagram (grid/half), TikTok (grid/half), Website (pill), Email (pill)
- **defaultBlocks**: text block ("About Me")
- Pill buttons will use the existing cardBg/border rendering — the soft pink on cream gives high enough contrast

## 2. Modernize "Neon" template in `vibeTemplates.ts`

Update existing neon entry:
- **bgColor/bg**: `#050505` (deepest black)
- **accent**: `#00F2FF` (Electric Blue)
- **headerColor**: `#0a0a1a`
- **cardBg**: `#0f0f15`, **border**: `#1a1a2e`
- **glowColor**: `#00F2FF`
- **subtitle**: `Midnight Glow`

## 3. Add neon glow effect to PhoneMockup

In `PhoneMockup.tsx`, for the neon vibe specifically, add a `boxShadow` glow (`0 0 8px rgba(0,242,255,0.5)`) to the pill link buttons to simulate the neon tube effect.

## 4. Reorder carousel in `vibeTemplates.ts`

New array order: **Pure → Organic → Bloom → Vogue → Obsidian → Neon → Elevate**

## 5. Update ClaimStep placeholders

In `ClaimStep.tsx`, update `PLACEHOLDERS` array to: `["paul", "sophia", "justin", "chloe", "blake", "maya", "jake", "isabella"]`

## Files to modify

| File | Change |
|------|--------|
| `src/lib/vibeTemplates.ts` | Add Bloom, update Neon colors, reorder array |
| `src/components/personal/PhoneMockup.tsx` | Add neon glow box-shadow on pills for neon vibe |
| `src/components/personal/signup/ClaimStep.tsx` | Update PLACEHOLDERS array |

