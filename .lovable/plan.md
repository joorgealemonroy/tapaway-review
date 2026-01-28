
# Plan: Fix Mobile Layout Issues - No Horizontal Scrolling

## Problem Analysis

Based on the screenshots and code analysis, the user dashboard on mobile is being cut off on the right side. The core issues are:

1. **PersonalProfilePage.tsx still uses horizontal scrolling for photo collages** (lines 219-238) - This is the **public profile page**, and it still has `overflow-x-auto` with `flex gap-2` layout
2. **The dashboard layout itself may be exceeding viewport width** - Content containers and cards need proper width constraints
3. **Previous CSS changes used `overflow-x: hidden`** which hides the problem rather than fixing the root cause

## Root Cause

Looking at the code:
- `ProfilePreviewRenderer.tsx` (used in dashboard preview) was updated to use vertical grid - this is correct
- `PersonalProfilePage.tsx` (public profile) still has the old horizontal scroll implementation on lines 219-238
- The CSS `overflow-x: hidden` on body/html hides content rather than making it fit properly

## Solution

### 1. Fix PersonalProfilePage.tsx CollageWithLightbox Component

Convert the horizontal scrolling collage to a vertical grid (matching ProfilePreviewRenderer):

**Current (broken):**
```tsx
<div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4">
  <div className="flex gap-2" style={{ width: 'max-content' }}>
    {images.map(...)}
  </div>
</div>
```

**Fixed:**
```tsx
<div className="w-full">
  <div className="grid grid-cols-3 gap-1.5">
    {images.map((imgUrl, idx) => (
      <button
        key={idx}
        onClick={() => handleImageClick(idx)}
        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img 
          src={getOptimizedImageUrl(imgUrl, 150)} 
          alt="" 
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </button>
    ))}
  </div>
</div>
```

### 2. Ensure All Dashboard Containers Properly Constrain Width

Add proper width constraints to prevent any content from exceeding viewport:

- PersonalDashboard.tsx main container: Add `overflow-x-hidden` and ensure `max-w-full`
- AdminPersonalAccounts.tsx: Add proper container constraints
- Link/Block item text: Already truncated with `truncate` class

### 3. Update BlockModal.tsx Photo Collage Preview

The block modal's collage preview uses horizontal scroll - change to match the vertical grid pattern for consistency.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/personal/PersonalProfilePage.tsx` | Convert CollageWithLightbox from horizontal flex to vertical 3-column grid |
| `src/components/personal/BlockModal.tsx` | Update collage preview to match vertical grid pattern |
| `src/pages/personal/PersonalDashboard.tsx` | Ensure main container has proper width constraints |

---

## Technical Implementation

### PersonalProfilePage.tsx (lines 210-248)

Replace the CollageWithLightbox component's horizontal layout with vertical grid:

```tsx
const CollageWithLightbox = memo(function CollageWithLightbox({ images }: { images: string[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* Vertical grid layout - 3 columns, users scroll up/down */}
      <div className="w-full">
        <div className="grid grid-cols-3 gap-1.5">
          {images.map((imgUrl, idx) => (
            <button
              key={idx}
              onClick={() => handleImageClick(idx)}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img 
                src={getOptimizedImageUrl(imgUrl, 200, 85)} 
                alt="" 
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
      <ImageLightbox
        images={images}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
});
```

### BlockModal.tsx (lines 779-807)

Update collage image preview layout from horizontal scroll to grid:

```tsx
<div className="grid grid-cols-4 gap-2">
  {collageImages.map((imgUrl, idx) => (
    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
      <button
        onClick={() => handleRemoveCollageImage(idx)}
        className="absolute top-1 right-1 h-6 w-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  ))}
  {collageImages.length < 9 && (
    <button
      onClick={() => collageFileInputRef.current?.click()}
      disabled={uploadingCollageImage}
      className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
    >
      {/* ... add button content */}
    </button>
  )}
</div>
```

### PersonalDashboard.tsx (line 582)

Ensure the main container properly constrains width:

```tsx
<div className="min-h-screen bg-background overflow-x-hidden">
```

And the main content area (line 603):

```tsx
<main className="flex-1 max-w-2xl px-4 py-6 pb-32 overflow-x-hidden w-full">
```

---

## Expected Outcome

After these changes:
- Photo collages display as a vertical 3-column grid
- Users scroll up/down to see all images (no left/right swiping needed)
- Dashboard content fits within viewport on all portrait phone orientations
- No content is cut off on the right side
- Consistent behavior between live profile and preview
