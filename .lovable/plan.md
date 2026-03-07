

# Redesign "Fill in your links" — Focused Mapping Experience

## Problem

Sub-step 2 currently renders a full management list with drag handles, edit buttons, and delete buttons for every link/block. This creates choice paralysis. The user copied a layout — they just need to "fill in the blanks."

## Approach

Replace the list view in `renderSubStep2()` with a **focused single-link carousel** that presents one link at a time, inline-editable, with auto-advance on paste/enter. Keep the existing list-based management available via an "Edit all" escape hatch for power users.

### UX Flow

```text
┌─────────────────────────┐
│  [Larger Mobile Preview] │  ← sticky, taller (240px on mobile)
├─────────────────────────┤
│  ● ● ○ ○ ○ ○           │  ← link-level dots (not sub-step dots)
│                         │
│  🎵 TikTok              │  ← platform icon + label
│  ┌─────────────────────┐│
│  │ @yourhandle         ││  ← auto-focused input, placeholder from template
│  └─────────────────────┘│
│                         │
│  [← Prev]    [Next →]  │  ← or auto-advance on paste
│         Skip link       │
└─────────────────────────┘
```

### Key Changes to `LinksStep.tsx`

**1. Carousel state for sub-step 2**
- Add `activeLinkIndex` state (0-based) tracking which link is being filled.
- Group content: show social-type links first ("Socials"), then action/custom links ("Buttons & Links"), then blocks at the end.
- Each group gets a small label header as the user transitions between them.

**2. Single-input card per link**
- Show one card at a time: large platform icon, label, and a single `<Input>` auto-focused.
- Input uses the link's `placeholder` as the placeholder text (e.g. `@yourhandle`).
- On paste or Enter: call `updateLink(id, { value, url })`, animate a checkmark, then auto-advance to next link after 400ms.
- "Skip link" text button below advances without filling in.

**3. Remove management UI during wizard**
- No drag handles, edit icons, or delete icons in this view.
- Add a small "Edit all" link at the bottom that switches to the existing list view (`showListView` toggle) for users who want full control.

**4. Blocks handled simply**
- For blocks (youtube, text, button), show a mini inline editor (e.g. URL input for youtube, text input for text block).
- These appear after all links in the carousel.

**5. Larger preview on mobile**
- Increase the compact preview height from `h-[200px]` to `h-[260px]` and scale from `scale-[0.35]` to `scale-[0.42]`.
- As each link is filled, the preview updates in real-time (already works via state).

**6. Visual mapping feedback**
- Filled links get a green checkmark badge on their dot in the progress indicator.
- Unfilled links show hollow dots.

**7. Spotlight dimming**
- The active input card gets full opacity; a subtle `opacity-40` overlay dims the header area to keep focus on the input.

### Navigation within sub-step 2
- Back on first link → goes to sub-step 1
- Next on last link → goes to sub-step 3  
- The main "Next" button at the bottom changes to "Done with links" when on the last link

### "Add link" and "Add block" buttons
- Moved below the carousel card as secondary actions: "＋ Add another link" / "＋ Add a block"
- These open the existing `LinkModal` / `BlockModal` as before

## Files to Modify

| File | Change |
|------|--------|
| `src/components/personal/signup/LinksStep.tsx` | Rewrite `renderSubStep2()` to use focused single-link carousel with auto-advance, remove management UI, enlarge mobile preview, add link-level progress dots |

