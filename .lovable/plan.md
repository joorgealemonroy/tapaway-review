
# Plan: Fix Mobile Collage Swipe & Add Admin Username Change Feature

## Part 1: Fix Mobile Collage Swipe

### The Problem

The collage carousel uses Embla for swiping, but swiping doesn't work on mobile because of a CSS conflict:

**In `src/index.css` (lines 211-214):**
```css
button, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

The `touch-action: manipulation` restricts touch gestures to taps and pinch-zoom only — it blocks horizontal pan/swipe gestures that Embla needs.

Since collage images are wrapped in `<button>` elements (for click-to-open lightbox), the swipe gesture is blocked.

### The Solution

Add `touch-action: pan-x` to the carousel container to re-enable horizontal swiping. This allows the carousel to capture horizontal swipes while still permitting vertical page scrolling.

**Files to modify:**

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Add `touch-action: pan-x pan-y` and override button touch-action inside carousel |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Same changes for the preview renderer |

**Code change in CollageWithLightbox (PersonalProfilePage.tsx):**
```tsx
// Current:
<div className="w-full overflow-hidden" ref={emblaRef}>
  <div className="flex gap-1.5">
    {images.map((imgUrl, idx) => (
      <button
        key={idx}
        onClick={() => handleImageClick(idx)}
        className="flex-shrink-0 w-[31%] aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      >

// Updated:
<div 
  className="w-full overflow-hidden" 
  ref={emblaRef}
  style={{ touchAction: "pan-x pan-y" }}
>
  <div className="flex gap-1.5">
    {images.map((imgUrl, idx) => (
      <button
        key={idx}
        onClick={() => handleImageClick(idx)}
        className="flex-shrink-0 w-[31%] aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        style={{ touchAction: "pan-x" }}
      >
```

The key is:
- Container: `touch-action: pan-x pan-y` allows both horizontal and vertical gestures
- Buttons: `touch-action: pan-x` explicitly overrides the global `manipulation` rule to allow horizontal swiping

---

## Part 2: Admin Username Change Feature

### Overview

Add a feature in the admin edit modal for changing a user's username. The system will verify the new username is not already taken before allowing the change.

### State Variables to Add

```typescript
const [editUsername, setEditUsername] = useState("");
const [usernameChecking, setUsernameChecking] = useState(false);
const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
const [savingUsername, setSavingUsername] = useState(false);
```

### Functions to Add

**1. Check username availability (with debounce):**
```typescript
const checkUsernameAvailability = async (newUsername: string) => {
  if (!newUsername || newUsername === editingAccount?.username) {
    setUsernameAvailable(null);
    return;
  }
  
  // Validate format
  if (!/^[a-z0-9_]+$/.test(newUsername.toLowerCase())) {
    setUsernameAvailable(false);
    return;
  }
  
  setUsernameChecking(true);
  const { data } = await supabase
    .from("personal_profiles")
    .select("id")
    .eq("username", newUsername.toLowerCase())
    .maybeSingle();
  
  setUsernameAvailable(!data);
  setUsernameChecking(false);
};
```

**2. Update username:**
```typescript
const handleUpdateUsername = async () => {
  if (!editingAccount || !editUsername || !usernameAvailable) return;
  
  setSavingUsername(true);
  const { error } = await supabase
    .from("personal_profiles")
    .update({ username: editUsername.toLowerCase() })
    .eq("id", editingAccount.id);
  
  if (!error) {
    // Log the change
    await supabase.from("admin_audit_log").insert({...});
    setEditingAccount({ ...editingAccount, username: editUsername.toLowerCase() });
    toast.success(`Username changed to @${editUsername.toLowerCase()}`);
    loadAccounts();
  }
  setSavingUsername(false);
};
```

### UI Addition (in Basic Info tab)

Add a username section below the email section:

```text
┌──────────────────────────────────────────────────────────────┐
│ 👤 Username                                                   │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌──────────────────┐        │
│ │ johndoe                     │  │ Update Username  │        │
│ └─────────────────────────────┘  └──────────────────┘        │
│ New URL: tapaway.co/johndoe                                   │
│ ✓ Username available                                          │
└──────────────────────────────────────────────────────────────┘
```

**Visual feedback:**
- Spinner while checking availability
- Green checkmark + "Username available" when available
- Red X + "Already taken" when taken
- "Update Username" button disabled unless username changed AND available

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/personal/PersonalProfilePage.tsx` | Add `touch-action` styles to carousel container and buttons |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Same touch-action fix for preview |
| `src/pages/admin/AdminPersonalAccounts.tsx` | Add username state, validation, update logic, and UI |

---

## Technical Summary

### Collage Swipe Fix
- Override global `touch-action: manipulation` on button elements inside the carousel
- Use `touch-action: pan-x pan-y` on container and `touch-action: pan-x` on buttons
- Preserves click-to-open functionality while enabling swipe

### Admin Username Feature
- Debounced availability check (300ms delay)
- Lowercase-only usernames with validation
- Audit logging for accountability
- Real-time feedback in the UI
