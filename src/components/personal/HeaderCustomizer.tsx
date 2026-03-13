import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageCropper } from "./ImageCropper";
import { Paintbrush, Image as ImageIcon, X, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  headerType: "color" | "image" | "banner";
  headerColor: string | null;
  headerImageUrl: string | null;
  backgroundColor: string | null;
  onUpdate: (updates: {
    headerType?: "color" | "image" | "banner";
    headerColor?: string | null;
    headerImageUrl?: string | null;
    backgroundColor?: string | null;
  }) => void;
}

const COLOR_PRESETS = [
  "#000000", "#FFFFFF", "#1a1a2e", "#2d6a4f",
  "#e63946", "#4361ee", "#f4a261", "#9b5de5",
  "#F8C8DC", "#FFB6C1", "#DDA0DD", "#E8B4BC",
  "#B5EAD7", "#FFDAC1", "#C3B1E1",
];

const FADE_PRESETS = [
  { value: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)", label: "Blush" },
  { value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", label: "Lavender" },
  { value: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", label: "Cool Blue" },
  { value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", label: "Peach" },
  { value: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)", label: "Mint" },
  { value: "linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)", label: "Grey" },
];

export const HeaderCustomizer = ({
  headerType,
  headerColor,
  headerImageUrl,
  backgroundColor,
  onUpdate,
}: Props) => {
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [customColorInput, setCustomColorInput] = useState(headerColor || "#6BCB77");
  const [bgColorInput, setBgColorInput] = useState(backgroundColor || "#ffffff");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    // Compress large images before cropping
    let processedUrl: string;
    if (file.size > 2 * 1024 * 1024) {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
        });
        processedUrl = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Failed to process image");
        return;
      }
    } else {
      processedUrl = URL.createObjectURL(file);
    }

    setRawImageUrl(processedUrl);
    setCropperOpen(true);
  };

  const handleCropComplete = (_blob: Blob, previewUrl: string) => {
    onUpdate({ headerImageUrl: previewUrl, headerType: "image" });
    toast.success("Header image updated!");
  };

  const handleRemoveImage = () => {
    onUpdate({ headerImageUrl: null, headerType: "color" });
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-foreground">Header Style</Label>
      
      {/* Header Type Toggle */}
      <RadioGroup 
        value={headerType} 
        onValueChange={(v) => onUpdate({ headerType: v as "color" | "image" | "banner" })}
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
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="banner" id="header-banner" />
          <Label htmlFor="header-banner" className="text-sm flex items-center gap-1.5 cursor-pointer">
            <Sparkles className="h-4 w-4" />
            Full Banner
          </Label>
        </div>
      </RadioGroup>

      {headerType === "banner" && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            Your profile photo will be used as a full-width banner
          </p>
        </div>
      )}

      {headerType === "color" ? (
        <div className="space-y-3">
          {/* Popular colors */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Popular</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onUpdate({ headerColor: color });
                    setCustomColorInput(color);
                  }}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    headerColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Fade presets */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Fades</p>
            <div className="flex flex-wrap gap-2">
              {FADE_PRESETS.map((fade) => (
                <button
                  key={fade.label}
                  onClick={() => onUpdate({ headerColor: fade.value })}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    headerColor === fade.value ? "border-primary scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ background: fade.value }}
                  title={fade.label}
                />
              ))}
            </div>
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
                  onUpdate({ headerColor: customColorInput });
                }
              }}
              className="h-10 flex-1"
            />
            <input
              type="color"
              value={customColorInput.startsWith("#") ? customColorInput : "#6BCB77"}
              onChange={(e) => {
                setCustomColorInput(e.target.value);
                onUpdate({ headerColor: e.target.value });
              }}
              className="h-10 w-10 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
      ) : headerType === "image" ? (
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
                  className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <Upload className="h-4 w-4 text-white" />
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
              className="w-full h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload header image</span>
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
      ) : null}

      {/* Background Color */}
      <div className="pt-2 border-t border-border space-y-3">
        <Label className="text-sm font-medium text-foreground">Page Background</Label>
        <div className="flex flex-wrap gap-2">
          {["#ffffff", "#f5f5f5", "#fafafa", "#f0f0f0", "#e8e8e8", "#1a1a1a"].map((color) => (
            <button
              key={color}
              onClick={() => {
                onUpdate({ backgroundColor: color });
                setBgColorInput(color);
              }}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                backgroundColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
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
                onUpdate({ backgroundColor: bgColorInput });
              }
            }}
            className="h-10 flex-1"
          />
          <input
            type="color"
            value={bgColorInput.startsWith("#") ? bgColorInput : "#ffffff"}
            onChange={(e) => {
              setBgColorInput(e.target.value);
              onUpdate({ backgroundColor: e.target.value });
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
