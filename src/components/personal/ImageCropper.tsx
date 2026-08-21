import { useState, useCallback, useEffect, useRef } from "react";
import Cropper, { Area, MediaSize, Size } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  minZoom?: number;
  restrictPosition?: boolean;
  fillColor?: string | null;
  /** Show a background-fill color picker (banner crops only). */
  editableFill?: boolean;
  /** Trim uniform empty borders (e.g. white space around a logo) before cropping. */
  autoTrim?: boolean;
  /** Longest edge of the exported image (defaults to 1024). */
  maxOutputDimension?: number;
  /** Export quality 0-1 (defaults to 0.8). */
  outputQuality?: number;
  /** Always render the export at the full frame size, even when zoomed out. */
  fullFrameOutput?: boolean;
  title?: string;
}


const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_QUALITY = 0.8;

// Check WebP support once
const supportsWebP = (() => {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
})();

// Parse a CSS color (hex or rgb/rgba) into r,g,b so we can paint it on canvas.
function parseColor(input: string): { r: number; g: number; b: number } | null {
  if (!input) return null;
  const hex = input.replace('#', '');
  if (hex.length === 6) {
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16),
    };
  }
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  const rgbMatch = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  return null;
}

/**
 * Detect and remove uniform (or transparent) borders around an image so a logo
 * with a big empty margin fills the crop frame instead of forcing a zoom-out.
 * Returns null when there is nothing meaningful to trim.
 */
async function trimUniformBorders(imageSrc: string): Promise<string | null> {
  try {
    const image = await createImage(imageSrc);
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);

    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      // Tainted canvas (cross-origin without CORS) — skip trimming.
      return null;
    }

    const at = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    };

    // Reference = top-left corner pixel (the background of most logo exports).
    const ref = at(0, 0);
    const TOL = 18;
    const isBg = (x: number, y: number) => {
      const p = at(x, y);
      if (p.a < 16) return true; // transparent counts as empty
      if (ref.a < 16) return false;
      return (
        Math.abs(p.r - ref.r) <= TOL &&
        Math.abs(p.g - ref.g) <= TOL &&
        Math.abs(p.b - ref.b) <= TOL
      );
    };

    let top = 0;
    let bottom = h - 1;
    let left = 0;
    let right = w - 1;

    const rowEmpty = (y: number) => {
      for (let x = 0; x < w; x += 2) if (!isBg(x, y)) return false;
      return true;
    };
    const colEmpty = (x: number) => {
      for (let y = top; y <= bottom; y += 2) if (!isBg(x, y)) return false;
      return true;
    };

    while (top < bottom && rowEmpty(top)) top++;
    while (bottom > top && rowEmpty(bottom)) bottom--;
    while (left < right && colEmpty(left)) left++;
    while (right > left && colEmpty(right)) right--;

    const cropW = right - left + 1;
    const cropH = bottom - top + 1;
    if (cropW < 24 || cropH < 24) return null;

    // Only bother when the trim removes a meaningful amount of empty space.
    const removed = 1 - (cropW * cropH) / (w * h);
    if (removed < 0.08) return null;

    // Keep a small breathing margin so the artwork isn't flush to the edge.
    const pad = Math.round(Math.max(cropW, cropH) * 0.02);
    const sx = Math.max(0, left - pad);
    const sy = Math.max(0, top - pad);
    const sw = Math.min(w - sx, cropW + pad * 2);
    const sh = Math.min(h - sy, cropH + pad * 2);

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d");
    if (!octx) return null;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fillColor?: string | null,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY,
  fullFrameOutput = false,
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Calculate output dimensions.
  let outputWidth = pixelCrop.width;
  let outputHeight = pixelCrop.height;

  if (fullFrameOutput) {
    // Always render the banner frame at display resolution, even when the user
    // zoomed out so far that the crop rect is small in source pixels.
    const frameAspect = pixelCrop.width / pixelCrop.height;
    if (frameAspect >= 1) {
      outputWidth = maxDimension;
      outputHeight = Math.round(maxDimension / frameAspect);
    } else {
      outputHeight = maxDimension;
      outputWidth = Math.round(maxDimension * frameAspect);
    }
  } else if (outputWidth > maxDimension || outputHeight > maxDimension) {
    const scale = maxDimension / Math.max(outputWidth, outputHeight);
    outputWidth = Math.round(outputWidth * scale);
    outputHeight = Math.round(outputHeight * scale);
  }

  canvas.width = Math.max(1, outputWidth);
  canvas.height = Math.max(1, outputHeight);

  // Paint a seamless background fill color when the crop is zoomed out
  // past the image bounds (only used for rectangular banner crops).
  const parsed = fillColor ? parseColor(fillColor) : null;
  if (parsed) {
    ctx.fillStyle = `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw with high quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clamp the source rect to the image bounds and map it onto the matching
  // destination area, so letterboxed regions keep the fill color.
  const scaleX = canvas.width / pixelCrop.width;
  const scaleY = canvas.height / pixelCrop.height;
  const sx = Math.max(0, pixelCrop.x);
  const sy = Math.max(0, pixelCrop.y);
  const sRight = Math.min(image.naturalWidth, pixelCrop.x + pixelCrop.width);
  const sBottom = Math.min(image.naturalHeight, pixelCrop.y + pixelCrop.height);
  const sw = sRight - sx;
  const sh = sBottom - sy;

  if (sw > 0 && sh > 0) {
    ctx.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      (sx - pixelCrop.x) * scaleX,
      (sy - pixelCrop.y) * scaleY,
      sw * scaleX,
      sh * scaleY
    );
  }

  // Use WebP if supported (30% smaller), fallback to JPEG
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, dataUrl });
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, mimeType, quality);
  });
}

export const ImageCropper = ({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  cropShape = "round",
  minZoom = 1,
  restrictPosition,
  fillColor,
  editableFill,
  autoTrim,
  maxOutputDimension = DEFAULT_MAX_DIMENSION,
  outputQuality = DEFAULT_QUALITY,
  fullFrameOutput,
  title,
}: Props) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [fill, setFill] = useState<string>(fillColor || "#ffffff");
  const [activeSrc, setActiveSrc] = useState<string>(imageSrc);
  const mediaSizeRef = useRef<MediaSize | null>(null);
  const cropSizeRef = useRef<Size | null>(null);

  // Reset crop/zoom every time the modal opens or the source image changes,
  // so a previously-saved zoom-in doesn't lock the slider above 1.
  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setFill(fillColor || "#ffffff");
    setActiveSrc(imageSrc);
    mediaSizeRef.current = null;
    cropSizeRef.current = null;

    if (!autoTrim) return;
    let cancelled = false;
    trimUniformBorders(imageSrc).then((trimmed) => {
      if (!cancelled && trimmed) setActiveSrc(trimmed);
    });
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, fillColor, autoTrim]);


  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  /** Zoom out just enough that the whole image sits inside the crop frame. */
  const fitWholeImage = useCallback(() => {
    const media = mediaSizeRef.current;
    const cropSize = cropSizeRef.current;
    if (!media || !cropSize) return;
    const fit = Math.min(
      cropSize.width / media.width,
      cropSize.height / media.height
    );
    setCrop({ x: 0, y: 0 });
    setZoom(Math.max(minZoom, Math.min(3, fit)));
  }, [minZoom]);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      const { blob, dataUrl } = await getCroppedImg(
        activeSrc,
        croppedAreaPixels,
        editableFill ? fill : fillColor,
        maxOutputDimension,
        outputQuality,
        fullFrameOutput,
      );
      // Return data URL for localStorage persistence instead of blob URL
      onCropComplete(blob, dataUrl);
      onOpenChange(false);
    } catch (e) {
      console.error("Error cropping image:", e);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  // Default: circular avatar photos stay centered and cannot be pulled out of bounds.
  // Rectangular banner crops allow free zoom-out and off-center positioning so logos
  // can be fit to the frame.
  const effectiveRestrictPosition = restrictPosition ?? cropShape === "round";
  const activeFill = editableFill ? fill : fillColor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{title || "Crop your photo"}</DialogTitle>
        </DialogHeader>

        {/* Cropper area — the frame matches the real banner shape */}
        <div
          className="relative h-72"
          style={{ backgroundColor: activeFill || "#000000" }}
        >
          <Cropper
            image={activeSrc}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={3}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={false}
            restrictPosition={effectiveRestrictPosition}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            onMediaLoaded={(size) => { mediaSizeRef.current = size; }}
            onCropSizeChange={(size) => { cropSizeRef.current = size; }}
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={minZoom}
              max={3}
              step={0.05}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          {editableFill && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Background</p>
                <p className="text-xs text-muted-foreground">
                  Fills any empty space around your logo
                </p>
              </div>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(fill) ? fill : "#ffffff"}
                onChange={(e) => setFill(e.target.value)}
                className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
                aria-label="Banner background color"
              />
            </div>
          )}



          {/* Buttons */}
          <div className="flex gap-2">
            {cropShape === "rect" && (
              <Button variant="outline" onClick={fitWholeImage} className="flex-1">
                <Maximize2 className="h-4 w-4 mr-2" />
                Fit whole logo
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
