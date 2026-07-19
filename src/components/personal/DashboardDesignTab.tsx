import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageCropper } from "./ImageCropper";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Paintbrush, 
  Image as ImageIcon, 
  X, 
  Upload,
  Loader2,
  Sparkles,
  Lock,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ProUpgradeDialog } from "./ProUpgradeDialog";
import { Switch } from "@/components/ui/switch";
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
  isFoundingUser?: boolean;
  showFoundingBadge?: boolean;
  isRepDemo?: boolean;
  onUpgrade?: () => void;
  onUpdate: (updates: {
    headerType?: string;
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

const BG_PRESETS = [
  "#ffffff", "#f5f5f5", "#fafafa", "#1a1a1a", "#0a0a0a", "#1e293b",
  "#fef3c7", "#ecfdf5",
  "#F8C8DC", "#FFB6C1", "#DDA0DD", "#E8B4BC",
  "#B5EAD7", "#FFDAC1", "#C3B1E1",
];

const BG_FADE_PRESETS = [
  { value: "linear-gradient(180deg, #fdfcfb 0%, #e2d1c3 100%)", label: "Warm" },
  { value: "linear-gradient(180deg, #e0eafc 0%, #cfdef3 100%)", label: "Sky" },
  { value: "linear-gradient(180deg, #f3e7e9 0%, #e3eeff 100%)", label: "Rose" },
  { value: "linear-gradient(180deg, #fceabb 0%, #f8b500 100%)", label: "Sunset" },
  { value: "linear-gradient(180deg, #667db6 0%, #0082c8 50%, #667db6 100%)", label: "Ocean" },
  { value: "linear-gradient(180deg, #232526 0%, #414345 100%)", label: "Midnight" },
];

export const DashboardDesignTab = ({
  profileId,
  headerType,
  headerColor,
  headerImageUrl,
  backgroundColor,
  profilePhotoUrl,
  isPremium,
  isFoundingUser,
  showFoundingBadge,
  isRepDemo,
  onUpgrade,
  onUpdate,
}: Props) => {
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageBasedColor, setImageBasedColor] = useState<string | null>(null);
  const [extractingColor, setExtractingColor] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userPickedBg = useRef(false);
  const hasInitialized = useRef(false);

  // --- Pending (buffered) state for deferred save ---
  const [pendingHeaderType, setPendingHeaderType] = useState(isRepDemo ? "banner" : headerType);
  const [pendingHeaderColor, setPendingHeaderColor] = useState(headerColor);
  const [pendingBgColor, setPendingBgColor] = useState(backgroundColor);
  const [customColorInput, setCustomColorInput] = useState(headerColor || "#6BCB77");
  const [bgColorInput, setBgColorInput] = useState(backgroundColor || "#ffffff");

  // Force banner mode on rep-created demo hubs and persist it once
  useEffect(() => {
    if (!isRepDemo) return;
    if (headerType !== "banner") {
      setPendingHeaderType("banner");
      supabase
        .from("personal_profiles")
        .update({ header_type: "banner" })
        .eq("id", profileId)
        .then(() => onUpdate({ headerType: "banner" }));
    }
  }, [isRepDemo, headerType, profileId, onUpdate]);

  // Re-sync pending state when props change externally (e.g. photo upload
  // auto-matches background_color). Without this, pendingBgColor stays stale
  // and the Unsaved-Changes bar can overwrite the freshly-sampled color
  // back to the previous value.
  useEffect(() => {
    if (userPickedBg.current) return;
    setPendingHeaderType(isRepDemo ? "banner" : headerType);
    setPendingHeaderColor(headerColor);
    setPendingBgColor(backgroundColor);
    setCustomColorInput(headerColor || "#6BCB77");
    setBgColorInput(backgroundColor || "#ffffff");
  }, [headerType, headerColor, backgroundColor, isRepDemo]);

  const hasChanges = useMemo(() => {
    return (
      pendingHeaderType !== headerType ||
      pendingHeaderColor !== headerColor ||
      pendingBgColor !== backgroundColor
    );
  }, [pendingHeaderType, headerType, pendingHeaderColor, headerColor, pendingBgColor, backgroundColor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {};
      if (pendingHeaderType !== headerType) updates.header_type = pendingHeaderType;
      if (pendingHeaderColor !== headerColor) updates.header_color = pendingHeaderColor;
      if (pendingBgColor !== backgroundColor) updates.background_color = pendingBgColor;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("personal_profiles")
          .update(updates)
          .eq("id", profileId);
        if (error) throw error;
      }

      // Push to parent so preview updates with saved values
      onUpdate({
        headerType: pendingHeaderType,
        headerColor: pendingHeaderColor,
        backgroundColor: pendingBgColor,
      });
      userPickedBg.current = false;
      toast.success("Design saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    userPickedBg.current = false;
    setPendingHeaderType(headerType);
    setPendingHeaderColor(headerColor);
    setPendingBgColor(backgroundColor);
    setCustomColorInput(headerColor || "#6BCB77");
    setBgColorInput(backgroundColor || "#ffffff");
    // Reset preview back to saved values
    onUpdate({
      headerType,
      headerColor,
      backgroundColor,
    });
  };

  // Local-only setters (update preview + pending state, no DB write)
  const handleColorChange = (color: string) => {
    setPendingHeaderColor(color);
    setCustomColorInput(color);
  };

  const handleBgColorChange = (color: string) => {
    userPickedBg.current = true;
    setPendingBgColor(color);
    setBgColorInput(color);
  };

  const handleTypeChange = (type: string) => {
    setPendingHeaderType(type);
  };

  // For banner mode, we use the profile photo as the banner (no separate upload)
  const bannerImageSource = pendingHeaderType === "banner" ? profilePhotoUrl : null;

  // Auto-apply ambient gradient when banner mode is active
  useEffect(() => {
    if (userPickedBg.current) return;

    // Skip auto-apply on initial mount to prevent toast on every tab visit
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Still extract color for the "Auto match" button, just don't auto-apply
      const imageSource = pendingHeaderType === "banner" ? bannerImageSource : profilePhotoUrl;
      if (imageSource) {
        extractBottomColor(imageSource)
          .then((color) => setImageBasedColor(color))
          .catch(() => setImageBasedColor(null));
      }
      return;
    }

    const imageSource = pendingHeaderType === "banner" ? bannerImageSource : profilePhotoUrl;
    if (!imageSource) {
      setImageBasedColor(null);
      return;
    }
    
    setExtractingColor(true);
    extractBottomColor(imageSource)
      .then((color) => {
        setImageBasedColor(color);
        const ambientGradient = generateAmbientGradient(color);
        
        const isLegacyGradient = pendingBgColor?.startsWith('linear-gradient');
        const isRadialGradient = pendingBgColor?.startsWith('radial-gradient');
        const shouldAutoApply = !pendingBgColor || isLegacyGradient || isRadialGradient;
        
        if (shouldAutoApply) {
          setPendingBgColor(ambientGradient);
          setBgColorInput(ambientGradient);
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
  }, [pendingHeaderType, bannerImageSource]);

  // --- Image upload stays immediate ---
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
        if (!ctx) { reject(new Error("No 2d context")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); },
          "image/jpeg", 0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image must be less than 20MB"); return; }

    let processedFile: Blob = file;
    if (file.size > 2 * 1024 * 1024) {
      try { processedFile = await compressImage(file); }
      catch { toast.error("Failed to process image"); return; }
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
      const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(filePath);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("personal_profiles").update({ header_image_url: urlWithBust, header_type: "image" }).eq("id", profileId);
      onUpdate({ headerImageUrl: urlWithBust, headerType: "image" });
      setPendingHeaderType("image");
      toast.success("Header image updated!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload header image");
    } finally { setUploading(false); }
  };

  const handleRemoveImage = async () => {
    try {
      await supabase.from("personal_profiles").update({ header_image_url: null, header_type: "color" }).eq("id", profileId);
      onUpdate({ headerImageUrl: null, headerType: "color" });
      setPendingHeaderType("color");
    } catch (err) {
      console.error("Error removing image:", err);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="space-y-8">
      {/* Sticky save bar */}
      <UnsavedChangesBar
        hasPendingChanges={hasChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={saving}
      />

      {/* Header Style Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Header Style</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRepDemo
              ? "Your uploaded logo appears as a full-width banner."
              : "Choose how your profile header appears"}
          </p>
        </div>

        {!isRepDemo && (
        <>
        <RadioGroup 
          value={pendingHeaderType} 
          onValueChange={handleTypeChange}
          className="grid grid-cols-3 gap-3"
        >
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
          {isPremium ? (
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
          ) : (
            <div
              onClick={() => setUpgradeFeature("Full Banner Mode")}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all hover:bg-muted/50 relative"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Full Banner</span>
              <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Lock className="h-2.5 w-2.5" />
                Pro
              </span>
            </div>
          )}
        </RadioGroup>
        </>
        )}

        {/* Pro upgrade dialog */}
        <ProUpgradeDialog
          open={!!upgradeFeature}
          onOpenChange={(open) => !open && setUpgradeFeature(null)}
          featureName={upgradeFeature || ""}
          onUpgrade={() => {
            setUpgradeFeature(null);
            onUpgrade?.();
          }}
        />

        {pendingHeaderType === "banner" ? (
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Full-Screen Banner Mode</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your profile photo displays as a stunning full-screen banner with ambient color matching.
                </p>
              </div>
            </div>
          </div>
        ) : pendingHeaderType === "color" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Popular</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      pendingHeaderColor === color ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Fades</p>
              <div className="flex flex-wrap gap-2">
                {FADE_PRESETS.map((fade) => (
                  <button
                    key={fade.label}
                    onClick={() => handleColorChange(fade.value)}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      pendingHeaderColor === fade.value ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
                    }`}
                    style={{ background: fade.value }}
                    title={fade.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColorInput.startsWith("#") ? customColorInput : "#000000"}
                onChange={(e) => {
                  setCustomColorInput(e.target.value);
                  handleColorChange(e.target.value);
                }}
                className="h-10 w-10 rounded-lg border-0 cursor-pointer"
              />
              <Input
                type="text"
                placeholder="#000000"
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
        ) : pendingHeaderType === "image" ? (
          !isPremium ? (
            <div 
              onClick={() => setUpgradeFeature("Custom Header Image")}
              className="w-full h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer relative"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload header image</span>
              <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Lock className="h-2.5 w-2.5" />
                Pro
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {headerImageUrl ? (
                <div className="relative">
                  <img src={headerImageUrl} alt="Header" className="w-full h-24 object-cover rounded-lg" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
                    </button>
                    <button onClick={handleRemoveImage} className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
          )
        ) : null}
      </div>

      <div className="h-px bg-border" />

      {/* Background Section */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-base font-semibold text-foreground">Background</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Set your page's background color</p>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
        
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Popular</p>
          <div className="flex flex-wrap gap-2">
            {BG_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => handleBgColorChange(color)}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  pendingBgColor === color ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Fades</p>
          <div className="flex flex-wrap gap-2">
            {BG_FADE_PRESETS.map((fade) => (
              <button
                key={fade.label}
                onClick={() => handleBgColorChange(fade.value)}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  pendingBgColor === fade.value ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
                }`}
                style={{ background: fade.value }}
                title={fade.label}
              />
            ))}
          </div>
        </div>
        
        {(bannerImageSource || profilePhotoUrl) && imageBasedColor && (
          <button
            onClick={() => handleBgColorChange(generateAmbientGradient(imageBasedColor))}
            className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-full flex-shrink-0 ring-2 ring-primary/20" style={{ background: generateAmbientGradient(imageBasedColor) }} />
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
        </CollapsibleContent>
      </Collapsible>

      {/* Founding Creator Badge Toggle */}
      {isFoundingUser && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Founding Creator Badge</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Display your Founding Creator badge on your public profile
              </p>
            </div>
            <Switch
              checked={showFoundingBadge ?? false}
              onCheckedChange={async (checked) => {
                try {
                  const { error } = await supabase
                    .from("personal_profiles")
                    .update({ show_founding_badge: checked })
                    .eq("id", profileId);
                  if (error) throw error;
                  toast.success(checked ? "Badge visible on your profile" : "Badge hidden from your profile");
                  // Force page refresh to update state
                  window.location.reload();
                } catch (err) {
                  console.error("Toggle badge error:", err);
                  toast.error("Failed to update badge visibility");
                }
              }}
            />
          </div>
        </div>
      )}

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
