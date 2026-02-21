
# Fix Layout Accumulation Bug

## Problem
When a user selects a Pro hub layout and then goes back and picks a Free template (or vice versa), the old links/blocks remain in the draft because the guard on line 144 (`if (onboardingData.links.length === 0 && onboardingData.blocks.length === 0)`) prevents the new template from being applied.

## Fix

**File:** `src/pages/personal/PersonalSignup.tsx` (lines 143-175)

Remove the guard that checks for empty links/blocks. Instead, always clear existing links and blocks before applying the new template. Use the `update` function to reset `links: []` and `blocks: []` before adding the new template's items.

```typescript
// Replace the guarded block with:

// Clear existing draft content before applying new template
update({ links: [], blocks: [] });

// Add template links
template.defaultLinks.forEach((l, i) => {
  addLink({ type: l.type, label: l.label, value: "", url: "",
    sortOrder: l.sortOrder ?? i, displayStyle: l.displayStyle,
    pillColor: l.pillColor, gridSize: l.gridSize, isFeatured: l.isFeatured });
});

// Add template blocks
template.defaultBlocks.forEach((b, i) => {
  addBlock({ type: b.type, content: b.content, sortOrder: b.sortOrder ?? i });
});

// Apply style
update({
  headerType: template.headerType,
  headerColor: template.style.headerColor,
  backgroundColor: template.style.bgColor,
});
```

This ensures that switching between Pro and Free layouts always starts fresh with the selected template's content.
