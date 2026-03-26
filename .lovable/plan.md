

# Optimize Video Loading in Photo Collage for Mobile

## Problem

The collage `<video>` elements load the **full video file** just to show a thumbnail preview. On mobile networks this is extremely slow and wastes bandwidth — users don't need to watch these previews, they just need to see a frame.

## Solution

Replace the `<video>` tag in the collage carousel with a **poster-frame approach**: generate a thumbnail using a short-lived `<video>` element to grab the first frame onto a `<canvas>`, then display a static `<img>` instead. For the lightbox (where the user actually watches), keep full video loading but add `preload="none"` until playback starts.

### Changes

**`src/pages/personal/PersonalProfilePage.tsx`** — `CollageWithLightbox`

- Replace the inline `<video>` preview with a new `VideoThumbnail` component that:
  1. Creates an off-screen `<video>` with `preload="metadata"` to fetch only the first few KB
  2. On `loadeddata`, draws the first frame to a canvas and converts to a data URL
  3. Renders a static `<img>` with the captured frame (or a gray placeholder while loading)
  4. Keeps the play icon overlay
- This avoids downloading the full video file for each carousel item

**`src/components/personal/ImageLightbox.tsx`**

- Add `preload="metadata"` to the lightbox `<video>` (currently loads full file on mount)
- This defers full download until the user actually hits play

### VideoThumbnail component (inline in PersonalProfilePage.tsx)

```tsx
const VideoThumbnail = memo(function VideoThumbnail({ url }: { url: string }) {
  const [poster, setPoster] = useState<string | null>(null);
  
  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        setPoster(canvas.toDataURL("image/jpeg", 0.7));
      } catch {}
    };
    return () => { video.src = ""; };
  }, [url]);

  return poster 
    ? <img src={poster} alt="" className="w-full h-full object-cover" /> 
    : <div className="w-full h-full bg-muted animate-pulse" />;
});
```

### Files

| File | Change |
|------|--------|
| `src/pages/personal/PersonalProfilePage.tsx` | Add `VideoThumbnail`, replace `<video>` in carousel with it |
| `src/components/personal/ImageLightbox.tsx` | Add `preload="metadata"` to lightbox video |

