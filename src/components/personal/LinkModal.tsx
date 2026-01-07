import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_CONFIGS, getPlatformConfig, PlatformConfig, PLATFORM_COLORS, detectPlatformFromUrl } from "@/lib/platformLinks";
import { PersonalLink } from "@/hooks/usePersonalOnboarding";
import { ArrowLeft, Check, Sparkles, LayoutList, Circle } from "lucide-react";

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
  onAdd: (link: Omit<PersonalLink, "id"> & { displayStyle?: string }) => void;
  editingLink?: (PersonalLink & { displayStyle?: string }) | null;
  onUpdate?: (id: string, updates: Partial<PersonalLink & { displayStyle?: string }>) => void;
  existingTypes?: string[];
}

export const LinkModal = ({ 
  open, 
  onOpenChange, 
  onAdd, 
  editingLink,
  onUpdate,
  existingTypes = [] 
}: Props) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [youtubeType, setYoutubeType] = useState<"handle" | "channel">("handle");
  const [customLabel, setCustomLabel] = useState("");
  const [pillColor, setPillColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformConfig | null>(null);
  const [displayStyle, setDisplayStyle] = useState<"pill" | "icon" | "both">("pill");

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
    } else if (editingLink) {
      const config = getPlatformConfig(editingLink.type);
      if (config) {
        setSelectedPlatform(config);
        setInputValue(editingLink.value);
        setCustomLabel(editingLink.label !== config.label ? editingLink.label : "");
        setPillColor(editingLink.pillColor || null);
        setDisplayStyle((editingLink.displayStyle as "pill" | "icon" | "both") || "pill");
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

    if (editingLink && onUpdate) {
      onUpdate(editingLink.id, { value, url, label, type: selectedPlatform.type, pillColor, displayStyle });
    } else {
      onAdd({ type: selectedPlatform.type, value, url, label, pillColor, displayStyle });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingLink ? "Edit link" : selectedPlatform ? "Add link" : "Add a link"}
          </DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
};
