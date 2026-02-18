

# Redesign: Live Preview Builder (Step 2)

## The Problem

Right now Step 2 ("Build your profile") dumps photo upload, links, blocks, and theme settings into one long form with no visual feedback. Users don't see what their hub looks like until Step 3. Links and blocks are in separate lists and can't be reordered together. It feels messy and confusing.

## The Solution

Merge Steps 2 and 3 into a single "Build your profile" step with a **live preview always visible**. The user edits on the left (or bottom on mobile) and sees their hub update in real-time on the right (or top on mobile). Links and blocks become a single unified list that can be freely reordered.

## New Flow

```text
Step 1: Identity (unchanged)
Step 2: Build your profile (editor + live preview side by side)
Step 3: Card selector (just the physical card options, no phone preview -- they already saw it)
Step 4: Checkout (unchanged)
```

## Step 2 Redesign Details

### Layout

**Desktop (if ever used):** Side-by-side -- editor on left, phone preview on right.

**Mobile (primary):** Stacked -- a compact phone preview at the top (smaller, ~200px tall, scrollable), with the editor below. A floating "Preview" button lets users expand the preview to full size in a bottom sheet.

### Editor Sections (simplified)

The editor becomes a clean, guided list of collapsible sections:

1. **Photo and Bio** -- Profile photo upload + headline/bio input (always open by default)
2. **Content** -- A single unified list mixing links AND blocks together. Users can drag any item up or down freely. "Add link" and "Add block" buttons sit at the bottom.
3. **Style** -- Header color/image + background color (collapsed by default)

### Unified Content List

Instead of separate "Links" and "Blocks" sections, combine them into one list called "Content". Each item shows its icon and label. Users drag to reorder freely -- a link can go between two blocks, a block between two links. This maps directly to how `ProfilePreviewRenderer` already renders items (it uses `sort_order` to interleave them).

### Live Preview

The `ProfilePreviewPanel` (phone mockup) renders at the top of the page on mobile. It updates in real-time as the user makes changes. It shows everything: profile photo, name, headline, header/banner, background color, links, and blocks -- exactly what the final hub looks like.

### Step 3 Simplification

Step 3 becomes just the physical card selector (custom/basic/none) without the phone preview, since the user has already been building with the preview visible the whole time.

## Technical Details

### Files to modify

1. **`src/components/personal/signup/LinksStep.tsx`** -- Major rewrite. Rename conceptually to "BuildStep". Add:
   - `ProfilePreviewPanel` at the top showing live preview in a compact phone frame
   - A floating "Preview" FAB that opens a full-size preview in a Drawer
   - Merge links + blocks into a single "Content" section with unified drag-and-drop
   - Move photo upload and headline into a "Photo and Bio" section
   - Keep theme in a collapsible "Style" section

2. **`src/components/personal/signup/PreviewStep.tsx`** -- Simplify. Remove the `ProfilePreviewPanel` (it's now in Step 2). Keep only the card selector UI.

3. **`src/pages/personal/PersonalSignup.tsx`** -- Update step titles:
   - Step 2: "Build your profile" (keep same)
   - Step 3: "Get a physical card" (was "This is your TapAway")

4. **`src/hooks/usePersonalOnboarding.ts`** -- Add a `reorderContent` method that accepts a mixed array of links and blocks and assigns sequential `sort_order` values to both.

### Unified content reordering logic

Links currently don't have a `sortOrder` field. We need to:
- Add `sortOrder` to `PersonalLink` interface
- When reordering the unified list, assign sequential sort orders to every item (link or block)
- The preview renderer already sorts by `sort_order`, so it will just work

### Mobile preview approach

- A scaled-down phone frame (200px tall, `transform: scale(0.5)` inside a fixed-height container) sits at the top of the editor
- A floating "Preview" button (bottom-right, offset above the nav) opens a `Drawer` (vaul) with the full-size `ProfilePreviewPanel`
- The preview updates live as data changes

### What stays the same

- `IdentityStep` (Step 1) -- no changes
- `CheckoutStep` (Step 4) -- no changes
- `LinkModal` -- no changes (still used to add/edit individual links)
- `BlocksManager` modal -- reuse the add/edit dialog, but the list rendering moves into the unified content list
- `ImageCropper` -- no changes
- `HeaderCustomizer` -- no changes
- `ProfilePreviewRenderer` -- no changes

