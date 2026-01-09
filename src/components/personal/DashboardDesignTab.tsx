import { useState, useRef } from "react";
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
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  profileId: string;
  headerType: string;
  headerColor: string | null;
  headerImageUrl: string | null;
  backgroundColor: string | null;
  pfpPosition: string;
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

const BG_GRADIENT_PRESETS = [
  // Red ambient
  "linear-gradient(135deg, #1a0000 0%, #3d0000 25%, #1a0000 50%, #0a0000 100%)",
  "linear-gradient(180deg, #0a0000 0%, #2d0a0a 50%, #1a0000 100%)",
  "radial-gradient(ellipse at center, #2d0a0a 0%, #0a0000 70%, #000000 100%)",
  // Blue ambient
  "linear-gradient(135deg, #000a1a 0%, #00203d 25%, #000a1a 50%, #00050a 100%)",
  "linear-gradient(180deg, #00050a 0%, #0a1a2d 50%, #000a1a 100%)",
  "radial-gradient(ellipse at center, #0a1a2d 0%, #00050a 70%, #000000 100%)",
  // Purple ambient
  "linear-gradient(135deg, #0d001a 0%, #1f003d 25%, #0d001a 50%, #05000a 100%)",
  "linear-gradient(180deg, #05000a 0%, #150a2d 50%, #0d001a 100%)",
  "radial-gradient(ellipse at center, #150a2d 0%, #05000a 70%, #000000 100%)",
  // Green ambient
  "linear-gradient(135deg, #001a0d 0%, #003d1f 25%, #001a0d 50%, #000a05 100%)",
  "linear-gradient(180deg, #000a05 0%, #0a2d15 50%, #001a0d 100%)",
];

export const DashboardDesignTab = ({
  profileId,
  headerType,
  headerColor,
  headerImageUrl,
  backgroundColor,
  pfpPosition,
  onUpdate,
}: Props) => {
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [customColorInput, setCustomColorInput] = useState(headerColor || "#6BCB77");
  const [bgColorInput, setBgColorInput] = useState(backgroundColor || "#ffffff");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-6">
      {/* Header Style */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-foreground">Header Style</Label>
        
        <RadioGroup 
          value={headerType} 
          onValueChange={handleTypeChange}
          className="flex gap-3"
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
        </RadioGroup>

        {headerType === "color" ? (
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
        {/* Ambient gradient presets */}
        <Label className="text-xs text-muted-foreground">Ambient Gradients</Label>
        <div className="flex flex-wrap gap-2">
          {BG_GRADIENT_PRESETS.map((gradient, i) => (
            <button
              key={i}
              onClick={() => handleBgColorChange(gradient)}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                backgroundColor === gradient ? "border-primary scale-110" : "border-border hover:scale-105"
              }`}
              style={{ background: gradient }}
            />
          ))}
        </div>
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

      {/* Image Cropper */}
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
    </div>
  );
};
