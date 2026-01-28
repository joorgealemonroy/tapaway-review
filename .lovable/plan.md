
# Plan: Remove Profile Photo Position Option, Default to Centered

## Overview

Remove the profile photo position selector UI from both places it appears (Hero Editor and Design Tab) and ensure all profiles default to centered positioning.

---

## Changes Required

### 1. DashboardHeroEditor.tsx

**Remove:**
- The entire "PFP Position" section (lines 146-183)
- The `position` state variable and related logic
- The `pfp_position` from the update payload (always use "center")
- Import of `AlignCenter`, `AlignLeft` icons
- Import of `RadioGroup`, `RadioGroupItem` components
- The `pfpPosition` prop (no longer needed)

**Keep:**
- The save functionality for name, headline, bio

**Lines to remove:** 146-183 (entire PFP Position section)
**Lines to modify:** 
- Line 39: Remove `position` state
- Lines 47, 55: Remove position from effects
- Line 68: Always save `pfp_position: "center"`

### 2. DashboardDesignTab.tsx

**Remove:**
- The entire "PFP Position" section (lines 454-477)
- The `handlePfpPositionChange` function (lines 271-280)
- The `pfpPosition` prop from the interface and component params
- Import of `AlignLeft`, `AlignCenter` icons (if not used elsewhere)

### 3. PersonalDashboard.tsx

**Modify:**
- Remove `pfpPosition` prop when calling `DashboardHeroEditor` (line 704)
- Remove `pfpPosition` prop when calling `DashboardDesignTab` (line 731)

### 4. create-personal-account Edge Function

**Modify:**
- Always set `pfp_position: "center"` regardless of input (line 132)

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/personal/DashboardHeroEditor.tsx` | Remove PFP Position section, state, props, and effects; always save "center" |
| `src/components/personal/DashboardDesignTab.tsx` | Remove PFP Position section and handler function |
| `src/pages/personal/PersonalDashboard.tsx` | Remove `pfpPosition` props from component calls |
| `supabase/functions/create-personal-account/index.ts` | Always default to "center" |

---

## Technical Details

### DashboardHeroEditor.tsx (simplified)

```tsx
// Remove these imports
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { AlignCenter, AlignLeft } from "lucide-react";

// Remove pfpPosition from Props interface
interface Props {
  profileId: string;
  username: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  // pfpPosition: string; <-- REMOVE
  onUpdate: (updates: Partial<{
    full_name: string;
    headline: string | null;
    bio: string | null;
    pfp_position: string;
  }>) => void;
}

// Remove position state
// const [position, setPosition] = useState(pfpPosition || "center"); <-- REMOVE

// Remove from hasChanges check
const changed = 
  name !== fullName ||
  headlineValue !== (headline || "") ||
  bioValue !== (bio || "");
  // position !== (pfpPosition || "center"); <-- REMOVE

// Always save "center"
const updates = {
  full_name: name.trim(),
  headline: headlineValue.trim() || null,
  bio: bioValue.trim() || null,
  pfp_position: "center", // Always centered
};

// Remove entire PFP Position section (lines 146-183)
```

### DashboardDesignTab.tsx

```tsx
// Remove pfpPosition from Props interface and component params

// Remove the handler function
// const handlePfpPositionChange = async (position: string) => { ... }

// Remove the entire PFP Position section (lines 454-477)
```

---

## Behavior After Changes

- All profiles will display with centered profile photo
- Users will no longer see the position option in their dashboard
- New accounts created by admin will always have centered position
- Existing accounts with "left" position will remain unchanged in the database, but the UI will always render as centered (since we won't check the value anymore in the preview/profile pages)

**Note:** The `ProfilePreviewRenderer.tsx` and `PersonalProfilePage.tsx` will still reference `pfp_position` from the database, but since all new saves will be "center" and the UI option is removed, this is acceptable. The rendering code can stay as-is for backward compatibility with any existing "left" positions.
