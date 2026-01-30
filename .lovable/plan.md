

# Plan: Profile Page UI Improvements

## Overview

This plan addresses four issues with the personal profile page:
1. **Rounded corners** on the solid content section (where "beige"/extracted color ends)
2. **Desktop scrolling** — currently requires using the side scrollbar
3. **Photo collage layout** — return to horizontal scrolling on public profile
4. **Collage swipe support** — enable swipe gestures without needing arrow buttons

---

## Issue 1: Rounded Corners on Solid Content Section

**Problem**: Looking at the screenshots, when the profile has a banner with an extracted color, the solid content section (the beige/extracted color area) ends with a straight edge. The user wants rounded bottom corners like in the reference images.

**Solution**: Add `rounded-3xl` to the solid content container.

### Files to Modify

**`src/pages/personal/PersonalProfilePage.tsx`** (lines 952-956)

```tsx
// Current
<div 
  className={hasBanner ? "rounded-t-3xl pt-4 pb-2 -mx-4 px-4" : ""}
  style={hasBanner && extractedBannerColor ? { backgroundColor: extractedBannerColor } : undefined}
>

// Updated - add rounded-b-3xl for bottom corners
<div 
  className={hasBanner ? "rounded-3xl pt-4 pb-6 -mx-4 px-4" : ""}
  style={hasBanner && extractedBannerColor ? { backgroundColor: extractedBannerColor } : undefined}
>
```

**`src/components/personal/ProfilePreviewRenderer.tsx`** (lines 734-736)

```tsx
// Current
<div 
  className={`mt-6 space-y-3 px-6 pb-8 ${hasBanner ? 'rounded-t-2xl pt-4 -mx-0' : ''}`}

// Updated
<div 
  className={`mt-6 space-y-3 px-6 pb-8 ${hasBanner ? 'rounded-2xl pt-4 -mx-0' : ''}`}
```

---

## Issue 2: Desktop Scrolling Not Working Properly

**Problem**: The phone-frame container on desktop has `md:overflow-hidden`, which prevents normal scroll behavior. Users have to use the browser's scrollbar helper.

**Solution**: Remove `md:overflow-hidden` from the phone-frame container and ensure proper scrolling.

### File to Modify

**`src/pages/personal/PersonalProfilePage.tsx`** (lines 804-805)

```tsx
// Current
className="min-h-screen md:max-w-[430px] md:mx-auto md:relative md:overflow-hidden md:rounded-3xl md:mb-4"

// Updated - remove md:overflow-hidden
className="min-h-screen md:max-w-[430px] md:mx-auto md:relative md:rounded-3xl md:mb-4"
```

---

## Issue 3 & 4: Collage Horizontal Scroll with Swipe Support

**Problem**: The current collage uses a 3-column grid where images stack vertically. The user wants:
- Horizontal scrolling (like Instagram stories)
- Native swipe support (no arrow buttons needed)

**Solution**: Use `embla-carousel-react` (already installed) to create a swipeable horizontal carousel. Show 3 images at a time with smooth swipe navigation.

### Files to Modify

**`src/pages/personal/PersonalProfilePage.tsx`** — Update `CollageWithLightbox` component

Replace the vertical grid with a horizontal swipeable carousel:

```tsx
import useEmblaCarousel from "embla-carousel-react";

const CollageWithLightbox = memo(function CollageWithLightbox({ images }: { images: string[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [emblaRef] = useEmblaCarousel({ 
    loop: false, 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true // Allows free scrolling without snap
  });

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* Horizontal swipeable carousel - shows 3 images at a time */}
      <div className="w-full overflow-hidden" ref={emblaRef}>
        <div className="flex gap-1.5">
          {images.map((imgUrl, idx) => (
            <button
              key={idx}
              onClick={() => handleImageClick(idx)}
              className="flex-shrink-0 w-[31%] aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
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

**`src/components/personal/ProfilePreviewRenderer.tsx`** — Update `CollagePreview`

Same pattern for the dashboard preview:

```tsx
import useEmblaCarousel from "embla-carousel-react";

const CollagePreview = ({ images, isPreview, onLinkClick }: {...}) => {
  const [emblaRef] = useEmblaCarousel({ 
    loop: false, 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true
  });
  // ... rest of implementation
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `PersonalProfilePage.tsx` | Remove `md:overflow-hidden`, add `rounded-3xl` to content section, convert collage to Embla carousel |
| `ProfilePreviewRenderer.tsx` | Add `rounded-2xl` to content section, convert collage preview to Embla carousel |

---

## Visual Result

**Collage Before:**
```text
┌─────────────────────────────┐
│ [img1] [img2] [img3]        │
│ [img4] [img5] [img6]        │
│ [img7] ...                  │
└─────────────────────────────┘
```

**Collage After (swipeable):**
```text
┌─────────────────────────────┐
│ [img1] [img2] [img3] → swipe│
│                             │
└─────────────────────────────┘
```

**Content Section (with rounded corners):**
```text
         ╭────────────────╮
         │  Banner Image  │
         ╰────────────────╯
    ╭────────────────────────╮
    │    Solid Color Area    │
    │    (extracted color)   │
    │                        │
    │    Links & Content     │
    │                        │
    ╰────────────────────────╯  ← rounded bottom corners
```

