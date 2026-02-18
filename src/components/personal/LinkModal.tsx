import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_CONFIGS, getPlatformConfig, PlatformConfig, PLATFORM_COLORS, detectPlatformFromUrl } from "@/lib/platformLinks";
import { PersonalLink } from "@/hooks/usePersonalOnboarding";
import { ArrowLeft, Check, Sparkles, LayoutList, Circle, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageCropper } from "./ImageCropper";

const compressImageFile = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2d context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Preset colors for custom links
const COLOR_PRESETS = [
  "#000000", // Black
  "#ffffff", // White
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (link: Omit<PersonalLink, "id"> & { displayStyle?: string; coverImageUrl?: string; thumbnailUrl?: string }) => void;
  editingLink?: (PersonalLink & { displayStyle?: string; coverImageUrl?: string; thumbnailUrl?: string }) | null;
  onUpdate?: (id: string, updates: Partial<PersonalLink & { displayStyle?: string; coverImageUrl?: string; thumbnailUrl?: string }>) => void;
  existingTypes?: string[];
  existingIconTypes?: string[]; // Platform types that already have an icon
}

export const LinkModal = ({ 
  open, 
  onOpenChange, 
  onAdd, 
  editingLink,
  onUpdate,
  existingTypes = [],
  existingIconTypes = []
}: Props) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [youtubeType, setYoutubeType] = useState<"handle" | "channel">("handle");
  const [customLabel, setCustomLabel] = useState("");
  const [pillColor, setPillColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformConfig | null>(null);
  const [displayStyle, setDisplayStyle] = useState<"pill" | "icon" | "both">("pill");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gridSize, setGridSize] = useState<"half" | "full">("half");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperMode, setCropperMode] = useState<"cover" | "thumbnail">("cover");

  // Reset when modal closes or editing changes
  useEffect(() => {
    if (!open) {
      setSelectedPlatform(null);
      setInputValue("");
      setYoutubeType("handle");
      setCustomLabel("");
      setPillColor(null);
      setShowColorPicker(false);
      setDetectedPlatform(null);
      setDisplayStyle("pill");
      setCoverImageUrl(null);
      setGridSize("half");
      setThumbnailUrl(null);
    } else if (editingLink) {
      const config = getPlatformConfig(editingLink.type);
      if (config) {
        setSelectedPlatform(config);
        setInputValue(editingLink.value);
        setCustomLabel(editingLink.label !== config.label ? editingLink.label : "");
        setPillColor(editingLink.pillColor || null);
        setDisplayStyle((editingLink.displayStyle as "pill" | "icon" | "both") || "pill");
        setCoverImageUrl(editingLink.coverImageUrl || null);
        setGridSize(((editingLink as any).gridSize as "half" | "full") || "half");
        setThumbnailUrl(editingLink.thumbnailUrl || null);
        if (editingLink.type === "youtube") {
          setYoutubeType(editingLink.value.startsWith("UC") ? "channel" : "handle");
        }
      }
    }
  }, [open, editingLink]);

  // Auto-detect platform from URL input
  useEffect(() => {
    if (selectedPlatform?.type === "website" && inputValue.includes(".")) {
      const detected = detectPlatformFromUrl(inputValue);
      if (detected && detected !== "website") {
        const config = getPlatformConfig(detected);
        if (config && !existingTypes.includes(detected)) {
          setDetectedPlatform(config);
        } else {
          setDetectedPlatform(null);
        }
      } else {
        setDetectedPlatform(null);
      }
    } else {
      setDetectedPlatform(null);
    }
  }, [inputValue, selectedPlatform, existingTypes]);

  const availablePlatforms = PLATFORM_CONFIGS.filter(
    p => !existingTypes.includes(p.type) || editingLink?.type === p.type
  );

  const handleSelectPlatform = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setInputValue("");
    setCustomLabel("");
    setPillColor(null);
    setShowColorPicker(false);
    setDisplayStyle("pill");
    setDetectedPlatform(null);
    setCoverImageUrl(null);
    setGridSize("half");
    setThumbnailUrl(null);
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperMode("cover");
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeCoverImage = () => {
    setCoverImageUrl(null);
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperMode("thumbnail");
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob, _previewUrl: string) => {
    const iscover = cropperMode === "cover";
    const setter = iscover ? setCoverImageUrl : setThumbnailUrl;
    const setUploading = iscover ? setUploadingImage : setUploadingThumbnail;
    const folder = iscover ? "link-covers" : "thumbnails";

    setUploading(true);
    try {
      const ext = croppedBlob.type.includes("webp") ? "webp" : "jpeg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-link-images")
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-link-images")
        .getPublicUrl(filePath);

      setter(publicUrl);
      toast.success(iscover ? "Image uploaded!" : "Thumbnail uploaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeThumbnail = () => {
    setThumbnailUrl(null);
  };

  const handleSwitchToDetected = () => {
    if (!detectedPlatform) return;
    const extractedValue = detectedPlatform.extractValue(inputValue);
    setSelectedPlatform(detectedPlatform);
    setInputValue(extractedValue);
    setDetectedPlatform(null);
  };

  const handleBack = () => {
    setSelectedPlatform(null);
    setInputValue("");
  };

  const handleSave = () => {
    if (!selectedPlatform || !inputValue.trim()) return;

    const value = inputValue.trim();
    const url = selectedPlatform.generateUrl(value);
    const label = customLabel.trim() || selectedPlatform.label;
    // Only include gridSize if there's a cover image
    const finalGridSize = coverImageUrl ? gridSize : undefined;

    if (editingLink && onUpdate) {
      onUpdate(editingLink.id, { value, url, label, type: selectedPlatform.type, pillColor, displayStyle, coverImageUrl: coverImageUrl || undefined, gridSize: finalGridSize, thumbnailUrl: thumbnailUrl || undefined } as any);
    } else {
      onAdd({ type: selectedPlatform.type, value, url, label, pillColor, displayStyle, coverImageUrl: coverImageUrl || undefined, gridSize: finalGridSize, thumbnailUrl: thumbnailUrl || undefined } as any);
    }
    onOpenChange(false);
  };

  const renderPlatformInput = () => {
    if (!selectedPlatform) return null;

    const config = selectedPlatform;

    return (
      <div className="space-y-4 pt-2">
        {/* Platform header with back */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${config.gradient || config.bgColor}`}>
            <config.icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <span className="font-medium">{config.label}</span>
        </div>

        {/* YouTube options */}
        {config.type === "youtube" && (
          <RadioGroup 
            value={youtubeType} 
            onValueChange={(v) => setYoutubeType(v as "handle" | "channel")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="handle" id="yt-handle" />
              <Label htmlFor="yt-handle" className="text-sm">Handle (@username)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="channel" id="yt-channel" />
              <Label htmlFor="yt-channel" className="text-sm">Channel ID (UC...)</Label>
            </div>
          </RadioGroup>
        )}

        {/* Input field */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {config.type === "youtube" 
              ? (youtubeType === "handle" ? "Your YouTube handle" : "Your channel ID")
              : config.type === "email"
              ? "Your email address"
              : config.type === "website" || config.type === "spotify" || config.type === "applemusic"
              ? "Full URL"
              : `Your ${config.label} username`
            }
          </Label>
          <div className="relative">
            {config.prefix && config.inputType !== "url" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {config.type === "youtube" && youtubeType === "handle" ? "@" : config.prefix}
              </span>
            )}
            <Input
              type={config.inputType === "email" ? "email" : "text"}
              placeholder={config.type === "youtube" 
                ? (youtubeType === "handle" ? "yourchannel" : "UCxxxxxxxxx")
                : config.placeholder
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`h-12 ${config.prefix && config.inputType !== "url" ? "pl-8" : ""}`}
              autoFocus
            />
          </div>
        </div>

        {/* Custom label (optional) */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Button label (optional)
          </Label>
          <Input
            placeholder={config.label}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Custom color (for website/custom links) */}
        {(config.type === "website" || config.type === "email") && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div 
                className="h-5 w-5 rounded-full border border-border"
                style={{ backgroundColor: pillColor || config.bgColor.replace("bg-", "") }}
              />
              <span>Custom button color</span>
            </button>
            
            {showColorPicker && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                {/* Reset to default */}
                <button
                  type="button"
                  onClick={() => setPillColor(null)}
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    pillColor === null ? "border-primary" : "border-transparent"
                  }`}
                  style={{ background: config.gradient || config.bgColor.replace("bg-[", "").replace("]", "").replace("bg-", "") }}
                  title="Default"
                >
                  {pillColor === null && <Check className="h-4 w-4 text-white" />}
                </button>
                
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPillColor(color)}
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      pillColor === color ? "border-primary scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {pillColor === color && (
                      <Check className={`h-4 w-4 ${color === "#ffffff" ? "text-black" : "text-white"}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Display style toggle - only for social platforms */}
        {config.type !== "website" && config.type !== "email" && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Display style</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDisplayStyle("pill")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  displayStyle === "pill" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <LayoutList className="h-4 w-4" />
                <span className="text-xs font-medium">Button</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayStyle("icon")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  displayStyle === "icon" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <Circle className="h-4 w-4" />
                <span className="text-xs font-medium">Icon</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayStyle("both")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  displayStyle === "both" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <LayoutList className="h-3 w-3" />
                  <span className="text-[10px]">+</span>
                  <Circle className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium">Both</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {displayStyle === "icon" 
                ? "Shows as a small icon in the social bar" 
                : displayStyle === "both"
                ? "Shows as a button AND an icon in the social bar"
                : "Shows as a full button with label"}
            </p>
            {/* Warning when another link of same type already has icon */}
            {(displayStyle === "icon" || displayStyle === "both") && 
             existingIconTypes.includes(config.type) && 
             !(editingLink?.displayStyle === "icon" || editingLink?.displayStyle === "both") && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                ⚠️ Another {config.label} is set as an icon. Saving this will change it to a button.
              </p>
            )}
          </div>
        )}

        {/* Thumbnail icon upload - shows as small icon on left of button */}
        {!coverImageUrl && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Thumbnail icon (optional)</Label>
            {thumbnailUrl ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  disabled={uploadingThumbnail}
                />
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploadingThumbnail ? "Uploading..." : "Add thumbnail icon"}
                </span>
              </label>
            )}
            <p className="text-xs text-muted-foreground">Shows as a small square image on the left of the button</p>
          </div>
        )}

        {/* Cover image upload - shows as card-style link on profile */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Cover image (optional)</Label>
          {coverImageUrl ? (
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted">
              <img 
                src={coverImageUrl} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeCoverImage}
                className="absolute top-2 right-2 h-8 w-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <div className={`absolute bottom-2 left-2 h-8 w-8 rounded-full flex items-center justify-center ${config.gradient || config.bgColor}`}>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 bg-muted/50 rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploadingImage ? "Uploading..." : "Add a cover image"}
              </span>
              <span className="text-xs text-muted-foreground/70">
                Shows as a visual card on your profile
              </span>
            </label>
          )}
        </div>

        {/* Grid size toggle - only show when cover image is uploaded */}
        {coverImageUrl && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Card size</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGridSize("half")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  gridSize === "half" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-4 bg-current rounded opacity-70" />
                  <div className="w-4 h-4 bg-current rounded opacity-30" />
                </div>
                <span className="text-xs font-medium">Half width</span>
              </button>
              <button
                type="button"
                onClick={() => setGridSize("full")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  gridSize === "full" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="w-10 h-4 bg-current rounded opacity-70" />
                <span className="text-xs font-medium">Full width</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {gridSize === "half" 
                ? "Displays in a 2-column grid with other half-width cards" 
                : "Displays as a full-width card"}
            </p>
          </div>
        )}

        {/* Detected platform banner */}
        {detectedPlatform && (
          <button
            type="button"
            onClick={handleSwitchToDetected}
            className="flex items-center gap-3 w-full p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-left"
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${detectedPlatform.gradient || detectedPlatform.bgColor}`}>
              <detectedPlatform.icon className={`h-4 w-4 ${detectedPlatform.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {detectedPlatform.label} detected
              </p>
              <p className="text-xs text-muted-foreground">Tap to use branded styling</p>
            </div>
          </button>
        )}

        {/* Preview URL */}
        {inputValue && !detectedPlatform && (
          <p className="text-xs text-muted-foreground truncate">
            → {selectedPlatform.generateUrl(inputValue)}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className="w-full h-12"
        >
          {editingLink ? "Save Changes" : "Add Link"}
        </Button>
      </div>
    );
  };

  const isMobile = useIsMobile();
  
  const modalTitle = editingLink ? "Edit link" : selectedPlatform ? "Add link" : "Add a link";
  
  const modalContent = (
    <>
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={cropperMode === "cover" ? 4 / 3 : 1}
        cropShape={cropperMode === "cover" ? "rect" : "round"}
      />
      {!selectedPlatform ? (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {availablePlatforms.map((platform) => (
            <button
              key={platform.type}
              onClick={() => handleSelectPlatform(platform)}
              className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-left"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${platform.gradient || platform.bgColor}`}>
                <platform.icon className={`h-4 w-4 ${platform.color}`} />
              </div>
              <span className="text-sm font-medium">{platform.label}</span>
            </button>
          ))}
        </div>
      ) : (
        renderPlatformInput()
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{modalTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-8">
            {modalContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        {modalContent}
      </DialogContent>
    </Dialog>
  );
};
