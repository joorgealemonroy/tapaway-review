import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageCropper } from "./ImageCropper";
import { supabase } from "@/integrations/supabase/client";
import { 
  Paintbrush, 
  Image as ImageIcon, 
  X, 
  Upload,
  AlignLeft,
  AlignCenter,
  Loader2,
  Sparkles,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { extractBottomColor, generateAmbientGradient } from "@/lib/imageColorExtraction";

interface Props {
  profileId: string;
  headerType: string;
  headerColor: string | null;
  headerImageUrl: string | null;
  backgroundColor: string | null;
  pfpPosition: string;
  profilePhotoUrl: string | null;
  isPremium: boolean;
  onUpdate: (updates: {
    headerType?: string;
    headerColor?: string | null;
    headerImageUrl?: string | null;
    backgroundColor?: string | null;
    pfpPosition?: string;
  }) => void;
}

const COLOR_PRESETS = [
  "#6BCB77", "#1DA1F2", "#E91E63", "#9C27B0",
  "#FF5722", "#607D8B", "#000000", "#FFFFFF",
];

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
];

const BG_PRESETS = ["#ffffff", "#f5f5f5", "#fafafa", "#f0f0f0", "#e8e8e8", "#1a1a1a"];

export const DashboardDesignTab = ({
  profileId,
  headerType,
  headerColor,
  headerImageUrl,
  backgroundColor,
  pfpPosition,
  profilePhotoUrl,
  isPremium,
  onUpdate,
}: Props) => {
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [customColorInput, setCustomColorInput] = useState(headerColor || "#6BCB77");
  const [bgColorInput, setBgColorInput] = useState(backgroundColor || "#ffffff");
  const [uploading, setUploading] = useState(false);
  const [imageBasedColor, setImageBasedColor] = useState<string | null>(null);
  const [extractingColor, setExtractingColor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For banner mode, we use the profile photo as the banner (no separate upload)
  // When in banner mode, use the profilePhotoUrl for color extraction
  const bannerImageSource = headerType === "banner" ? profilePhotoUrl : null;

  // Auto-apply ambient gradient when banner mode is active (uses profile photo)
  useEffect(() => {
    // When NOT in banner mode, or no profile photo exists, clear the extracted color
    if (headerType !== "banner" || !bannerImageSource) {
      setImageBasedColor(null);
      return;
    }
    
    setExtractingColor(true);
    extractBottomColor(bannerImageSource)
      .then((color) => {
        setImageBasedColor(color);
        const ambientGradient = generateAmbientGradient(color);
        
        // Auto-apply if:
        // 1. No background is set yet, OR
        // 2. Current background is a legacy linear-gradient (old preset), OR
        // 3. Current background is already a radial-gradient (update to new extraction)
        const isLegacyGradient = backgroundColor?.startsWith('linear-gradient');
        const isRadialGradient = backgroundColor?.startsWith('radial-gradient');
        const shouldAutoApply = !backgroundColor || isLegacyGradient || isRadialGradient;
        
        if (shouldAutoApply) {
          handleBgColorChange(ambientGradient);
          toast.success("Background auto-matched to your profile photo");
        }
      })
      .catch(() => {
        setImageBasedColor(null);
      })
      .finally(() => {
        setExtractingColor(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerType, bannerImageSource, backgroundColor]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let { width, height } = img;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Compress if > 5MB
    let processedFile: Blob = file;
    if (file.size > 5 * 1024 * 1024) {
      try {
        processedFile = await compressImage(file);
      } catch {
        toast.error("Failed to process image");
        return;
      }
    }

    setRawImageUrl(URL.createObjectURL(processedFile));
    setCropperOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/header.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      // Update DB
      await supabase
        .from("personal_profiles")
        .update({ header_image_url: urlWithBust, header_type: "image" })
        .eq("id", profileId);

      onUpdate({ headerImageUrl: urlWithBust, headerType: "image" });
      toast.success("Header image updated!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload header image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await supabase
        .from("personal_profiles")
        .update({ header_image_url: null, header_type: "color" })
        .eq("id", profileId);

      onUpdate({ headerImageUrl: null, headerType: "color" });
    } catch (err) {
      console.error("Error removing image:", err);
      toast.error("Failed to remove image");
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      await supabase
        .from("personal_profiles")
        .update({ header_color: color })
        .eq("id", profileId);

      onUpdate({ headerColor: color });
      setCustomColorInput(color);
    } catch (err) {
      console.error("Error updating color:", err);
    }
  };

  const handleBgColorChange = async (color: string) => {
    try {
      await supabase
        .from("personal_profiles")
        .update({ background_color: color })
        .eq("id", profileId);

      onUpdate({ backgroundColor: color });
      setBgColorInput(color);
    } catch (err) {
      console.error("Error updating bg color:", err);
    }
  };

  const handleTypeChange = async (type: string) => {
    try {
      await supabase
        .from("personal_profiles")
        .update({ header_type: type })
        .eq("id", profileId);

      onUpdate({ headerType: type });
    } catch (err) {
      console.error("Error updating type:", err);
    }
  };

  const handlePfpPositionChange = async (position: string) => {
    try {
      await supabase
        .from("personal_profiles")
        .update({ pfp_position: position })
        .eq("id", profileId);

      onUpdate({ pfpPosition: position });
    } catch (err) {
      console.error("Error updating pfp position:", err);
    }
  };

  // Banner mode now uses the profile photo - no separate banner upload needed

  return (
    <div className="space-y-6">
      {/* Header Style */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-foreground">Header Style</Label>
        
        <RadioGroup 
          value={headerType} 
          onValueChange={handleTypeChange}
          className="flex flex-wrap gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="color" id="header-color" />
            <Label htmlFor="header-color" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Paintbrush className="h-4 w-4" />
              Solid Color
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="image" id="header-image" />
            <Label htmlFor="header-image" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              Custom Image
            </Label>
          </div>
          {isPremium && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="banner" id="header-banner" />
              <Label htmlFor="header-banner" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <Sparkles className="h-4 w-4 text-primary" />
                Full Banner
              </Label>
            </div>
          )}
        </RadioGroup>

        {headerType === "banner" ? (
          /* Full Banner mode - uses profile photo as banner (no separate upload) */
          <div className="space-y-3">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">
                ✨ Full-Screen Banner Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Your profile photo will be displayed as a full-screen banner that fades behind your content. 
                Update your photo in the Profile section above.
              </p>
            </div>
            {imageBasedColor && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wand2 className="h-3.5 w-3.5 text-primary" />
                  <span>Ambient background will auto-match your photo</span>
                </div>
              </div>
            )}
          </div>
        ) : headerType === "color" ? (
          <div className="space-y-3">
            {/* Color presets */}
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    headerColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Gradient presets */}
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((gradient, i) => (
                <button
                  key={i}
                  onClick={() => handleColorChange(gradient)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    headerColor === gradient ? "border-primary scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ background: gradient }}
                />
              ))}
            </div>

            {/* Custom hex input */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="#6BCB77"
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.target.value)}
                onBlur={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(customColorInput)) {
                    handleColorChange(customColorInput);
                  }
                }}
                className="h-10 flex-1"
              />
              <input
                type="color"
                value={customColorInput.startsWith("#") ? customColorInput : "#6BCB77"}
                onChange={(e) => {
                  setCustomColorInput(e.target.value);
                  handleColorChange(e.target.value);
                }}
                className="h-10 w-10 rounded border border-border cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {headerImageUrl ? (
              <div className="relative">
                <img 
                  src={headerImageUrl} 
                  alt="Header" 
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload header image</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* PFP Position */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Profile Photo Position</Label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePfpPositionChange("left")}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
              pfpPosition === "left" ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <AlignLeft className="h-4 w-4" />
            <span className="text-sm">Left</span>
          </button>
          <button
            onClick={() => handlePfpPositionChange("center")}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
              pfpPosition === "center" ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <AlignCenter className="h-4 w-4" />
            <span className="text-sm">Center</span>
          </button>
        </div>
      </div>

      {/* Background Color */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Page Background</Label>
        <div className="flex flex-wrap gap-2">
          {BG_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleBgColorChange(color)}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                backgroundColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {/* Show ambient preview when banner mode is active (uses profile photo) */}
        {bannerImageSource && imageBasedColor && (
          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Label className="text-xs text-primary flex items-center gap-1.5 font-medium">
              <Wand2 className="h-3 w-3" />
              ✨ Ambient background auto-matched to your banner
            </Label>
            <div
              className="h-12 w-full rounded-lg border-2 border-primary/30 flex items-center justify-center"
              style={{ background: generateAmbientGradient(imageBasedColor) }}
            >
              <span className="text-xs text-white/60">Auto-generated from your banner</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You can override this by selecting a solid color above
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="#ffffff"
            value={bgColorInput}
            onChange={(e) => setBgColorInput(e.target.value)}
            onBlur={() => {
              if (/^#[0-9A-Fa-f]{6}$/.test(bgColorInput)) {
                handleBgColorChange(bgColorInput);
              }
            }}
            className="h-10 flex-1"
          />
          <input
            type="color"
            value={bgColorInput.startsWith("#") ? bgColorInput : "#ffffff"}
            onChange={(e) => {
              setBgColorInput(e.target.value);
              handleBgColorChange(e.target.value);
            }}
            className="h-10 w-10 rounded border border-border cursor-pointer"
          />
        </div>
      </div>

      {/* Image Cropper for Header */}
      {rawImageUrl && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={rawImageUrl}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 5}
          cropShape="rect"
        />
      )}
      {/* Banner mode no longer needs separate cropper - uses profile photo */}
    </div>
  );
};
