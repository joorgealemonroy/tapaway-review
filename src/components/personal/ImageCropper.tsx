import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

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

const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_QUALITY = 0.8;

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

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fillColor?: string | null
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Calculate output dimensions - resize if too large
  let outputWidth = pixelCrop.width;
  let outputHeight = pixelCrop.height;
  
  if (outputWidth > MAX_IMAGE_DIMENSION || outputHeight > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(outputWidth, outputHeight);
    outputWidth = Math.round(outputWidth * scale);
    outputHeight = Math.round(outputHeight * scale);
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

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
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // Use WebP if supported (30% smaller), fallback to JPEG
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, IMAGE_QUALITY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, dataUrl });
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, mimeType, IMAGE_QUALITY);
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
}: Props) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Reset crop/zoom every time the modal opens or the source image changes,
  // so a previously-saved zoom-in doesn't lock the slider above 1.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      const { blob, dataUrl } = await getCroppedImg(imageSrc, croppedAreaPixels, fillColor);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Crop your photo</DialogTitle>
        </DialogHeader>

        {/* Cropper area */}
        <div className="relative h-72 bg-black">
          <Cropper
            image={imageSrc}
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
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
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
