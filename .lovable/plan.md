

# Fix: Banner Preview to Match Real Hub Proportions

## Problem

The "Full Banner" preview in the profile builder doesn't match how the banner actually looks on the live public profile. The banner height is nearly the same as a regular color header (`h-36` vs `h-32`), so it doesn't feel like a "full banner." Additionally, the text styling doesn't match the real hub (which shows `@username` in large bold white text overlapping the banner bottom, not the full name).

## Changes

### File: `src/components/personal/ProfilePreviewRenderer.tsx`

**1. Increase banner height to feel proportionally "full"**
- Change the banner container from `h-36` to `h-52` (208px out of ~560px frame = ~37%, closer to the real hub's 55vh feel while leaving room for content)
- Keep the non-banner header at `h-32` so there's a clear visual distinction

**2. Match real hub text styling in banner mode**
- When `hasBanner` is true, show `@username` in larger bold white text (matching the real hub's `text-3xl font-bold text-white`) instead of the generic `full_name` heading
- Show headline and bio below the username in white text, matching the real hub layout
- Adjust the overlap (`-mt-16` instead of `-mt-12`) so the text floats nicely on the banner fade

**3. Increase fade overlay height**
- Increase the gradient fade from `h-32` to `h-40` to accommodate the taller banner and larger text overlap, ensuring text is readable against the faded area

### Summary of pixel changes:

| Element | Current | Proposed | Real Hub |
|---------|---------|----------|----------|
| Banner height | h-36 (144px) | h-52 (208px) | 55vh (~330px) |
| Non-banner height | h-32 (128px) | h-32 (unchanged) | h-48 (192px) |
| Text overlap | -mt-12 | -mt-16 | -mt-24 |
| Fade overlay | h-32 | h-40 | h-64 |
| Name display (banner) | full_name | @username | @username |

These changes only affect the `ProfilePreviewRenderer` component, which is used in the dashboard preview panel and signup flow. The real public profile page (`PersonalProfilePage.tsx`) is unaffected.
