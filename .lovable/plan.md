

# Make Contact Card & Background Sections Collapsible

## Overview
Wrap the "Background" section in `DashboardDesignTab.tsx` and the "Contact Card" section in `PersonalDashboard.tsx` with `Collapsible` components so they start collapsed on mobile, reducing visual overwhelm.

## Changes

### `src/components/personal/DashboardDesignTab.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from lucide-react
- Wrap the Background section (lines 513-590) in a `Collapsible` that defaults to closed
- The trigger will be the existing "Background" heading with a chevron icon that rotates when open

### `src/components/personal/DashboardContactCard.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown` from lucide-react
- Wrap the fields area and save button inside `CollapsibleContent`, keeping the header with toggle as the `CollapsibleTrigger`
- Default to closed so the section is compact on load

### Files
| File | Change |
|------|--------|
| `src/components/personal/DashboardDesignTab.tsx` | Wrap Background section in Collapsible |
| `src/components/personal/DashboardContactCard.tsx` | Wrap form fields in Collapsible |

