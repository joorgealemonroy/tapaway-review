

# Plan: Setup Checklist + Compact Link Pills + Design Fork

## Overview

Three focused enhancements to the existing dashboard and import flow. No rebuilds — surgical additions.

---

## 1. Gamified Setup Checklist Widget

**New file: `src/components/personal/SetupChecklist.tsx`**

A floating circular progress ring widget (bottom-right on desktop, above mobile nav on mobile) that shows setup completion percentage.

**Checklist items** (dynamically computed from profile + links data):
- "Claim username" — checked if `profile.username` exists
- "Choose a vibe" — checked if `profile.vibe_id` exists
- "Add a profile picture" — checked if `profile.profile_photo_url` is non-null
- "Add your first 3 links" — checked if `links.length >= 3`

**UI**: 
- Floating button: 56px circle with an SVG circular progress ring (stroke-dasharray technique), percentage text in center
- On click: opens a bottom sheet (mobile) or popover (desktop) with the 4-item checklist, each with a check icon and label
- Unchecked items are tappable — navigate to the relevant tab or trigger the relevant action (e.g., clicking "Add a profile picture" opens the photo upload)
- Auto-hides permanently once all 4 items are checked (stored in localStorage)
- Uses Framer Motion for smooth open/close transitions

**Integration in `PersonalDashboard.tsx`**:
- Render `<SetupChecklist>` component, passing `profile`, `links.length`
- Position: `fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40`

---

## 2. Compact Link Pills in Dashboard Editor

**File: `src/components/personal/DashboardUnifiedContent.tsx`**

Current regular link rows use `p-3` padding with large icon circles (`h-10 w-10`), 4 action buttons, and full URL display — making each row tall.

**Changes** (~lines 842-906, regular link rendering):
- Reduce padding from `p-3` to `p-2`
- Shrink icon circle from `h-10 w-10` to `h-8 w-8`, icon from `h-5 w-5` to `h-4 w-4`
- Remove the URL subtitle line (`<p className="text-xs text-muted-foreground truncate">{link.url}</p>`)
- Collapse the 4 separate action buttons (Star, Eye, Edit, Delete) into a single "..." overflow menu using a `DropdownMenu` — keeps the row slim
- Each row becomes a single-line compact pill: `[grip] [icon] [label] [featured badge] [...menu]`
- Reduce `rounded-xl` to `rounded-lg`

**Grid items** (~lines 730-826): Keep as-is (image cards need the space).

**Block items** (~lines 908-953): Apply the same compaction — `p-2`, smaller icon, collapse Edit/Delete into overflow menu.

---

## 3. Design Fork Question After Import

**File: `src/pages/personal/ImportProfile.tsx`**

After the scraper returns results and before showing the Before/After preview, insert a "Design Fork" step.

**New state**: `imagePreference: 'yes' | 'no' | null` (initially `null`)

**UI** (shown when `result` exists and `imagePreference === null`):
- Animated card (Framer Motion fade-in) with the question: "Do you want images on your link buttons?"
- Two large visual option cards side by side:
  - **"Clean Pills"** — shows a mini preview of 3 stacked text-only pills, subtitle: "Compact & scannable"
  - **"Visual Cards"** — shows a mini preview of image cards in a grid, subtitle: "Rich & eye-catching"
- Selecting either sets `imagePreference` and transitions to the Before/After view

**Logic change in `scrapedToPreviewProps`** and `handleClaimPage`:
- If `imagePreference === 'no'`: strip `cover_image_url`, `thumbnail_url`, and `grid_size` from all links, force all to `display_style: 'pill'`
- If `imagePreference === 'yes'`: keep existing logic (images + grid pairing)
- Pass the preference through to `sessionStorage` import data so `PersonalSignup` respects it

---

## Files to Create/Modify

| File | Change |
|------|--------|
| **New**: `src/components/personal/SetupChecklist.tsx` | Floating progress ring + checklist sheet |
| `src/pages/personal/PersonalDashboard.tsx` | Import + render `SetupChecklist`, pass profile/links data |
| `src/components/personal/DashboardUnifiedContent.tsx` | Compact link rows, overflow menu for actions |
| `src/pages/personal/ImportProfile.tsx` | Add design fork question between scrape result and preview |

## Technical Details

- **SetupChecklist** uses an SVG `<circle>` with `stroke-dasharray` for the progress ring — no new dependencies needed
- **Overflow menu** uses existing `@/components/ui/dropdown-menu` (already in the project)
- **Framer Motion** is already imported in both `PersonalDashboard` and `ImportProfile`
- The checklist dismissal key in localStorage: `tapaway_setup_checklist_dismissed`
- No database changes required — all data is derived from existing profile/links queries

