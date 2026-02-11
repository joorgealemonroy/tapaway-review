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
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { extractBottomColor, generateAmbientGradient } from "@/lib/imageColorExtraction";

interface Props {
  profileId: string;
  headerType: string;
  headerColor: string | null;
  headerImageUrl: string | null;
  backgroundColor: string | null;
  profilePhotoUrl: string | null;
  isPremium: boolean;
  onUpdate: (updates: {
    headerType?: string;
    headerColor?: string | null;
    headerImageUrl?: string | null;
    backgroundColor?: string | null;
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
    const imageSource = headerType === "banner" ? bannerImageSource : profilePhotoUrl;
    if (!imageSource) {
      setImageBasedColor(null);
      return;
    }
    
    setExtractingColor(true);
    extractBottomColor(imageSource)
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

  // PFP position removed - always centered

  // Banner mode now uses the profile photo - no separate banner upload needed

  return (
    <div className="space-y-8">
      {/* Header Style Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Header Style</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose how your profile header appears
          </p>
        </div>
        
        <RadioGroup 
          value={headerType} 
          onValueChange={handleTypeChange}
          className="grid grid-cols-3 gap-3"
        >
          {/* Solid Color option */}
          <div>
            <RadioGroupItem value="color" id="header-color" className="peer sr-only" />
            <Label 
              htmlFor="header-color" 
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
            >
              <Paintbrush className="h-5 w-5" />
              <span className="text-xs font-medium">Solid Color</span>
            </Label>
          </div>
          
          {/* Custom Image option */}
          <div>
            <RadioGroupItem value="image" id="header-image" className="peer sr-only" />
            <Label 
              htmlFor="header-image" 
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-xs font-medium">Image</span>
            </Label>
          </div>
          
          {/* Full Banner (Premium only) */}
          {isPremium && (
            <div>
              <RadioGroupItem value="banner" id="header-banner" className="peer sr-only" />
              <Label 
                htmlFor="header-banner" 
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Full Banner</span>
              </Label>
            </div>
          )}
        </RadioGroup>

        {headerType === "banner" ? (
          /* Full Banner mode - uses profile photo as banner (no separate upload) */
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Full-Screen Banner Mode
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your profile photo displays as a stunning full-screen banner with ambient color matching.
                </p>
              </div>
            </div>
          </div>
        ) : headerType === "color" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Solid Colors</p>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`aspect-square rounded-full border-2 transition-all ${
                      headerColor === color ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Gradients</p>
              <div className="grid grid-cols-6 gap-2">
                {GRADIENT_PRESETS.map((gradient, i) => (
                  <button
                    key={i}
                    onClick={() => handleColorChange(gradient)}
                    className={`aspect-square rounded-full border-2 transition-all ${
                      headerColor === gradient ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:scale-110"
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColorInput.startsWith("#") ? customColorInput : "#6BCB77"}
                onChange={(e) => {
                  setCustomColorInput(e.target.value);
                  handleColorChange(e.target.value);
                }}
                className="h-10 w-10 rounded-lg border-0 cursor-pointer"
              />
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
                className="h-10 flex-1 font-mono text-sm"
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

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Background Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Background</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set your page's background color
          </p>
        </div>
        
        <div className="grid grid-cols-6 gap-2">
          {BG_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleBgColorChange(color)}
              className={`aspect-square rounded-full border-2 transition-all ${
                backgroundColor === color ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        
        {/* Show ambient preview when banner mode is active (uses profile photo) */}
        {(bannerImageSource || profilePhotoUrl) && imageBasedColor && (
          <button
            onClick={() => handleBgColorChange(generateAmbientGradient(imageBasedColor))}
            className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
          >
            <div
              className="h-10 w-10 rounded-full flex-shrink-0 ring-2 ring-primary/20"
              style={{ background: generateAmbientGradient(imageBasedColor) }}
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-foreground">Auto match to photo</p>
              <p className="text-xs text-muted-foreground">Tap to apply ambient gradient</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          </button>
        )}
        
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={bgColorInput.startsWith("#") ? bgColorInput : "#ffffff"}
            onChange={(e) => {
              setBgColorInput(e.target.value);
              handleBgColorChange(e.target.value);
            }}
            className="h-10 w-10 rounded-lg border-0 cursor-pointer"
          />
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
            className="h-10 flex-1 font-mono text-sm"
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
