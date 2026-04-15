

# Show Marketing Cards in Dashboard Content Section

## Problem
The marketing footer cards (CTA pill, Examples card, Features card) render in the phone preview panel but not in the left-side content/editor section of the dashboard. When viewing the `socials` profile (including admin impersonation), the user expects to see these elements in the content area.

## Solution
Add a read-only preview section below the `DashboardUnifiedContent` component in `PersonalDashboard.tsx`, visible only when `profile.username === 'socials'`. This will show a labeled, non-editable card summarizing the three marketing elements so the admin knows they exist and what they contain.

## Changes

| File | Change |
|------|--------|
| `src/pages/personal/PersonalDashboard.tsx` (~line 806) | After the `DashboardUnifiedContent` closing div, add a conditional block for `profile.username === 'socials'` that renders a summary card with the title "Marketing Footer (auto)" listing the three elements: CTA pill, Examples dropdown, and Features grid. Style it as a muted, read-only card with a `Megaphone` icon to distinguish it from editable content. |

The card will be a simple informational block — not editable — since these marketing elements are hardcoded for the socials demo profile. It confirms to the admin that the elements are present and will render on the public page and phone preview.

