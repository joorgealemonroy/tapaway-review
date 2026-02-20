
# Preserve Full Layout Fidelity When Copying a Hub

## Problem

When a user copies a hub layout from the "Real Hubs, Real People" section, several visual properties are lost:

- **Link properties dropped**: `display_style`, `pill_color`, `grid_size`, `is_featured`, and the original `sort_order` are all stripped out during the copy
- **Block properties dropped**: `alignment` and the original `sort_order` are lost; block content is replaced with generic placeholder text
- **Interleaving lost**: Links get sequential indices (0, 1, 2...) and blocks are appended after, destroying the original mix of links and blocks the source hub had

This means the preview the user sees during signup doesn't match the hub they copied.

## Solution

Carry all visual/layout properties through the copy pipeline so the new profile starts as an exact structural replica of the source hub.

## Technical Details

### 1. Expand the copied layout format (HubShowcase.tsx)

In `handleCopyLayout`, include all link styling properties and block alignment/sort_order in the stored layout:

**defaultLinks** will include: `type`, `label`, `placeholder`, `displayStyle`, `pillColor`, `gridSize`, `isFeatured`, `sortOrder`

**defaultBlocks** will include: `type`, `content` (placeholder), `alignment`, `sortOrder`

This preserves the original interleaved sort order so links at position 0, 2, 4 and blocks at position 1, 3 maintain their arrangement.

### 2. Apply properties during signup (PersonalSignup.tsx)

When consuming the copied layout, pass the extra properties through to `addLink` and `addBlock`:

- `addLink({ type, label, value: "", url: "", sortOrder, displayStyle, pillColor, gridSize, isFeatured })`
- `addBlock({ type, content, sortOrder })` with alignment stored in content

Since `addLink` already accepts all `PersonalLink` fields (including `pillColor`, `displayStyle`, `gridSize`, `isFeatured`, `sortOrder`) and `addBlock` accepts `sortOrder` through the `PersonalBlock` interface, this just requires passing them through.

### 3. Preserve block alignment (PersonalSignup.tsx)

Block alignment needs to be included in the block content object (since `addBlock` stores content as a generic record), or stored as a top-level property. The preview mapper in `LinksStep.tsx` already reads `block.content.alignment`, so storing it in the content object works.

### Files Modified

- **`src/components/card/HubShowcase.tsx`**: Expand `handleCopyLayout` to include all link styling props and block alignment/sort_order
- **`src/pages/personal/PersonalSignup.tsx`**: Update the template application logic to pass through all copied properties to `addLink`/`addBlock`
