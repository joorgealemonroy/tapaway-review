
# Plan: Remove Mobile Preview Icon & Add Live Preview to Links Tab

## Overview

This plan removes the floating preview button from mobile dashboard, moves the live preview directly into the Links tab for mobile users, and updates the Card tab to show an "Order Card" option instead of the "confirmed and being printed" message.

---

## Changes Required

### 1. Remove Mobile Preview FAB

**File: `src/pages/personal/PersonalDashboard.tsx`**

Remove the entire floating preview button and Sheet component (lines 954-977):

```tsx
// DELETE THIS ENTIRE BLOCK:
<Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
  <SheetTrigger asChild>
    <Button
      className="fixed right-4 xl:hidden rounded-full h-14 w-14 shadow-lg z-30"
      ...
    >
      <Smartphone className="h-6 w-6" />
    </Button>
  </SheetTrigger>
  ...
</Sheet>
```

Also remove the related state and handler:
- `const [previewSheetOpen, setPreviewSheetOpen] = useState(false);` (line 121)
- `const handleOpenPreview = useCallback(() => { ... }, []);` (lines 502-504)
- Remove `Smartphone` from imports (line 22)
- Update `UnsavedChangesBar` to remove `onPreview` prop

### 2. Add Live Preview to Links Tab (Mobile Only)

**File: `src/pages/personal/PersonalDashboard.tsx`**

Add the `ProfilePreviewPanel` inside the Links tab content, visible only on mobile (`xl:hidden`):

```tsx
<TabsContent value="links" className="space-y-6">
  {/* Hero Editor */}
  <DashboardHeroEditor ... />
  
  <div className="border-t pt-6">
    <DashboardUnifiedContent ... />
  </div>

  {/* NEW: Mobile Live Preview at bottom of Links tab */}
  <div className="xl:hidden border-t pt-6">
    <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
      Live Preview
    </p>
    <div className="flex justify-center">
      <ProfilePreviewPanel
        profile={profile}
        links={links}
        blocks={previewBlocks}
      />
    </div>
  </div>
</TabsContent>
```

This places the phone-frame preview at the bottom of the Links tab, visible only on mobile/tablet (hidden on xl+ where the sidebar preview shows).

### 3. Update Card Tab (Confirmed State)

**File: `src/pages/personal/PersonalDashboard.tsx`**

Replace the "confirmed and being printed" message with an "Order More Cards" option:

**Current (lines 822-837):**
```tsx
{profile.card_confirmed ? (
  <>
    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm text-primary">
      <Lock className="h-4 w-4" />
      <span>Your card design is confirmed and being printed</span>
    </div>
    <TapAwayCardPreview ... />
  </>
) : ...
```

**Updated:**
```tsx
{profile.card_confirmed ? (
  <div className="space-y-6">
    {/* Card Preview */}
    <TapAwayCardPreview
      ref={cardPreviewRef}
      fullName={profile.full_name}
      username={profile.username}
      profilePhotoUrl={profile.profile_photo_url}
      cardHeadline={profile.card_front_headline || undefined}
      cardBackText={profile.card_back_text || undefined}
    />
    
    {/* Order More Cards Section */}
    <div className="text-center space-y-3 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        Need more cards?
      </p>
      <RequestMoreCards restaurantId={profile.id} />
    </div>
  </div>
) : ...
```

**Note:** The existing `RequestMoreCards` component is designed for restaurants but can be reused. We may need to create a simplified version for personal profiles or rename the prop. Looking at the component, it accepts a `restaurantId` prop which we can pass `profile.id` to (the edge function can handle both).

### 4. Update UnsavedChangesBar

**File: `src/components/personal/UnsavedChangesBar.tsx`**

Remove the preview button from the unsaved changes bar since we no longer need it:

```tsx
// Remove onPreview prop from interface and usage
interface UnsavedChangesBarProps {
  hasPendingChanges: boolean;
  // onPreview: () => void;  ← REMOVE
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}
```

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/pages/personal/PersonalDashboard.tsx` | Remove FAB/Sheet, add preview to Links tab, update Card tab confirmed state |
| `src/components/personal/UnsavedChangesBar.tsx` | Remove `onPreview` prop and preview button |

---

## Visual Comparison

### Links Tab (Mobile) - After

```text
┌─────────────────────────────────────────┐
│ TapAway      [Switcher] [Logout]        │
├─────────────────────────────────────────┤
│                                         │
│  [Hero Editor: Name, Headline, Bio]     │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  [Links & Blocks - Drag to reorder]     │
│  • Instagram                            │
│  • LinkedIn                             │
│  • My Website                           │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  Live Preview                           │
│  ┌─────────────────────────────────┐    │
│  │    [Phone Frame Preview]        │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│ 🔗Links  🎨Design  📊Stats  ⚙️More     │
└─────────────────────────────────────────┘
```

### Card Tab (Confirmed) - After

```text
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │    [Your Card Preview]          │    │
│  │    Front / Back toggle          │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  Need more cards?                       │
│  [📦 Request More Cards]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technical Notes

1. **No floating elements on mobile** - The preview is now inline, eliminating overlap issues
2. **Preview is still visible on desktop** - The sidebar `<aside>` panel remains for xl+ screens
3. **RequestMoreCards component** - Already exists, can be imported and reused
4. **Import cleanup** - Remove `Smartphone` from lucide-react imports, add `RequestMoreCards` import
