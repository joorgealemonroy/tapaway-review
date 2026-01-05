import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PLATFORM_CONFIGS, getPlatformConfig, PlatformConfig } from "@/lib/platformLinks";
import { PersonalLink } from "@/hooks/usePersonalOnboarding";
import { ArrowLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (link: Omit<PersonalLink, "id">) => void;
  editingLink?: PersonalLink | null;
  onUpdate?: (id: string, updates: Partial<PersonalLink>) => void;
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

  // Reset when modal closes or editing changes
  useEffect(() => {
    if (!open) {
      setSelectedPlatform(null);
      setInputValue("");
      setYoutubeType("handle");
      setCustomLabel("");
    } else if (editingLink) {
      const config = getPlatformConfig(editingLink.type);
      if (config) {
        setSelectedPlatform(config);
        setInputValue(editingLink.value);
        setCustomLabel(editingLink.label !== config.label ? editingLink.label : "");
        if (editingLink.type === "youtube") {
          setYoutubeType(editingLink.value.startsWith("UC") ? "channel" : "handle");
        }
      }
    }
  }, [open, editingLink]);

  const availablePlatforms = PLATFORM_CONFIGS.filter(
    p => !existingTypes.includes(p.type) || editingLink?.type === p.type
  );

  const handleSelectPlatform = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setInputValue("");
    setCustomLabel("");
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
      onUpdate(editingLink.id, { value, url, label, type: selectedPlatform.type });
    } else {
      onAdd({ type: selectedPlatform.type, value, url, label });
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

        {/* Preview URL */}
        {inputValue && (
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
