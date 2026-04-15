

# Fix Google Review Icon — Remove Blue Circle

## Problem
The Google Review button currently shows the multicolor "G" inside a blue circle. The user wants the clean multicolor "G" logo directly on the white pill background (as shown in their screenshot), without the circular blue container.

## Changes

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` (~line 268-272) | When `isGoogleReview`, render the `GoogleIcon` directly (no wrapping circle div), sized to ~h-8 w-8 |
| `src/components/personal/ProfilePreviewRenderer.tsx` (~line 500-510) | Same — skip the circle wrapper for Google Review, render icon inline |
| `src/components/personal/ProHubTemplate.tsx` (~line 182-185) | Same — render `GoogleIcon` without circle container |

The multicolor Google "G" SVG already exists and has correct colored fills. We just need to stop wrapping it in the blue `bg-[#4285F4]` circle for the Google Review link type.

