

# Layout Setup Wizard — Guided Sub-Steps in Profile Builder

## Current State

Step 2 ("Build your profile") in `LinksStep.tsx` (702 lines) renders everything at once: photo/bio, links/blocks, and style as collapsible sections. This is overwhelming, especially on mobile after copying a layout.

## Approach

Refactor `LinksStep.tsx` to use internal sub-steps (a wizard within the wizard), keeping the same parent 3-step flow intact. No new files needed — the component already contains the sections, they just need to be gated by a `subStep` state.

### Sub-Step Breakdown

| Sub-Step | Title | Content | Skippable? |
|----------|-------|---------|------------|
| 1 | "Add your photo" | Profile photo upload + headline input | No (photo required) |
| 2 | "Fill in your links" | Template links list + add link/block | Yes |
| 3 | "Pick your style" | HeaderCustomizer (colors, banner) | Yes |

### Key Changes to `LinksStep.tsx`

1. **Add `subStep` state** (1-3) with forward/back navigation within the component
2. **Progress bar** at the top showing sub-step progress (using existing Progress component or simple dots)
3. **"Skip for now" button** on sub-steps 2 and 3, which advances without requiring input
4. **Live preview** stays at the top (already exists as the compact preview + drawer) — no change needed
5. **Desktop split-pane**: On `lg+` screens, show form on the left and preview panel on the right using a flex layout instead of the compact scaled preview
6. **Navigation**: Sub-step back goes to previous sub-step (or parent `onBack` if on sub-step 1). Sub-step forward on last sub-step calls parent `onNext`.

### UI Structure (Mobile)

```text
┌─────────────────────────┐
│  [Live Preview - compact]│
├─────────────────────────┤
│  ● ○ ○  Step 1 of 3    │
│  "Add your photo"       │
│                         │
│  [Photo] [Headline]     │
│                         │
│  [Continue]             │
└─────────────────────────┘
```

### UI Structure (Desktop lg+)

```text
┌──────────────────┬──────────────┐
│  ● ○ ○           │              │
│  "Add your photo" │  Phone Frame │
│                  │   Preview    │
│  [Photo]         │              │
│  [Headline]      │              │
│                  │              │
│  [Continue]      │              │
└──────────────────┴──────────────┘
```

### Auto-Save

Already handled by `usePersonalOnboarding` hook — it debounce-saves to localStorage on every `update()` call. No additional work needed.

### Template Pre-Population

Already works — `PersonalSignup.tsx` parses the copied layout from sessionStorage and calls `addLink`/`addBlock` before `LinksStep` mounts. The wizard will show pre-populated links in sub-step 2 with placeholder hints.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/personal/signup/LinksStep.tsx` | Add `subStep` state, split render into 3 sub-step views, add progress indicator, skip buttons, desktop split-pane layout |

