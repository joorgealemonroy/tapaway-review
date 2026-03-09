

# Dashboard Menu Collapsible Sections + Account Setup

## 1. Collapsible Menu Sections in Dashboard (`src/components/dashboard/MenuTab.tsx`)

Currently all menu sections are fully expanded cards, requiring lots of scrolling on mobile. Wrap each section in a Collapsible component (from Radix) so owners can expand/collapse sections.

**Changes:**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown` icon
- Wrap each section card's content (items list + "Add Item" button) in `CollapsibleContent`
- Make the section header row a `CollapsibleTrigger` with a chevron that rotates when open
- Default all sections to collapsed, showing just the section name + item count
- Keep section name input editable when expanded

**Layout per section (collapsed):**
```text
┌─────────────────────────────────┐
│  ▶  Tacos (3 items)        🗑  │
└─────────────────────────────────┘
```

**Layout per section (expanded):**
```text
┌─────────────────────────────────┐
│  ▼  Section Name [input]   🗑  │
│  ┌─ Item 1 ─────────────────┐  │
│  │ Name / Desc / Price      │  │
│  └──────────────────────────┘  │
│  [+ Add Item]                  │
└─────────────────────────────────┘
```

## 2. Account Setup for Las Islas Marias OG

The restaurant exists (slug: `islasmarias`, owner_id: `42be65b3-...`) but is linked to a placeholder email. Need to:
- Create a new auth user with email `alexis@tapaway.co` and password `Lasislasmarias`
- Update the restaurant's `owner_id` to the new user
- Add `alexis@tapaway.co` to the grandfathered users list so they bypass paywall

This requires a database migration to update the owner_id after user creation, plus an edge function call or manual SQL to create the auth user.

**Approach:** Use the `create-legacy-client-account` edge function (or a new simple edge function) to create the auth user and reassign the restaurant. For now, add `alexis@tapaway.co` to grandfathered emails so login works smoothly.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/MenuTab.tsx` | Wrap sections in Collapsible, add chevron toggle, show item count when collapsed |
| `src/lib/grandfatheredUsers.ts` | Add `alexis@tapaway.co` to grandfathered list |
| Edge function or SQL | Create auth user + reassign restaurant owner_id |

