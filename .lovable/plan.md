

# Make Hero Identity Collapsible

## Change
Wrap the entire Hero Identity section in `DashboardHeroEditor.tsx` with a `Collapsible` component, defaulting to **closed** on mobile (consistent with the collapsible dashboard sections pattern from memory).

### Implementation
- **File**: `src/components/personal/DashboardHeroEditor.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown` icon
- Replace the static `<Label>Hero Identity</Label>` (line 211) with a clickable trigger row showing "Hero Identity" + a rotating chevron
- Wrap lines 213-292 (all the form fields) inside `<CollapsibleContent>`
- Default `open={false}` so the section starts collapsed, saving vertical space

### No other files changed
The parent component renders `DashboardHeroEditor` as-is; no props or integration changes needed.

