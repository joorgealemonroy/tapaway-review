import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { HeaderCustomizer } from "@/components/personal/HeaderCustomizer";
import { getPlatformConfig } from "@/lib/platformLinks";
import { 
  ArrowLeft,
  CheckCircle2,
  Truck,
  ExternalLink,
  Settings,
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PreviewStep = ({ formData, updateFormData, onNext, onBack }: Props) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);

  const handleBlockDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;

    const newBlocks = [...formData.blocks];
    const [draggedBlock] = newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    updateFormData({ blocks: newBlocks.map((b, i) => ({ ...b, sortOrder: i })) });
    setDraggedBlockIndex(index);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockIndex(null);
  };

  const updateBlockAlignment = (blockId: string, alignment: "left" | "center" | "right" | "full") => {
    const updatedBlocks = formData.blocks.map(block => 
      block.id === blockId 
        ? { ...block, content: { ...block.content, alignment } }
        : block
    );
    updateFormData({ blocks: updatedBlocks });
  };

  return (
    <div className="space-y-6">
      {/* Settings Collapsible */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Customize Card & Theme
            </span>
            <span className="text-xs text-muted-foreground">
              {settingsOpen ? "Hide" : "Show"}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Card Headline Editor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Card Headline Text</Label>
            <Input
              value={formData.cardHeadline || "Tap to Connect &\nCollaborate"}
              onChange={(e) => updateFormData({ cardHeadline: e.target.value })}
              placeholder="Tap to Connect & Collaborate"
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Use line breaks for multi-line text. This appears on your physical card.
            </p>
          </div>

          {/* Header Customization */}
          <HeaderCustomizer
            headerType={formData.headerType || "color"}
            headerColor={formData.headerColor}
            headerImageUrl={formData.headerImageUrl}
            backgroundColor={formData.backgroundColor}
            onUpdate={(updates) => updateFormData(updates)}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Profile Preview */}
      <div 
        className="rounded-2xl border border-border overflow-hidden"
        style={{ backgroundColor: formData.backgroundColor || "#ffffff" }}
      >
        {/* Header/Cover */}
        <div 
          className="h-20"
          style={{
            background: formData.headerType === "image" && formData.headerImageUrl
              ? `url(${formData.headerImageUrl}) center/cover`
              : formData.headerColor || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
          }}
        />
        
        {/* Profile Content */}
        <div className="px-6 pb-6 -mt-10">
          {/* Avatar */}
          <div className="relative inline-block">
            {formData.profilePhotoUrl ? (
              <img
                src={formData.profilePhotoUrl}
                alt={formData.fullName}
                className="h-20 w-20 rounded-full border-4 object-cover"
                style={{ borderColor: formData.backgroundColor || "#ffffff" }}
              />
            ) : (
              <div 
                className="h-20 w-20 rounded-full border-4 bg-muted flex items-center justify-center"
                style={{ borderColor: formData.backgroundColor || "#ffffff" }}
              >
                <span className="text-2xl font-bold text-muted-foreground">
                  {formData.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-[#1DA1F2] rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Name & Username */}
          <div className="mt-3">
            <h2 className="text-lg font-bold text-foreground">{formData.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{formData.username}</p>
          </div>

          {/* Links */}
          {formData.links.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.links.map((link) => {
                const config = getPlatformConfig(link.type);
                const Icon = config?.icon;
                
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${config?.gradient || config?.bgColor || "bg-muted/50"}`}
                  >
                    {Icon && <Icon className={`h-5 w-5 ${config?.color || "text-foreground"}`} />}
                    <span className={`text-sm font-medium flex-1 ${config?.color || "text-foreground"}`}>
                      {link.label}
                    </span>
                    <ExternalLink className={`h-4 w-4 ${config?.color || "text-foreground"} opacity-60`} />
                  </a>
                );
              })}
            </div>
          )}

          {/* Blocks preview with drag reorder */}
          {formData.blocks.length > 0 && (
            <div className="mt-4 space-y-3">
              {formData.blocks.map((block, index) => {
                const alignment = block.content.alignment || "center";
                const textAlignClass = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
                const flexAlignClass = alignment === "left" ? "justify-start" : alignment === "right" ? "justify-end" : "justify-center";
                
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleBlockDragStart(index)}
                    onDragOver={(e) => handleBlockDragOver(e, index)}
                    onDragEnd={handleBlockDragEnd}
                    className={`relative group transition-all ${
                      draggedBlockIndex === index ? "opacity-50 scale-95" : ""
                    }`}
                  >
                    {/* Drag handle + alignment controls overlay */}
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    {/* Alignment controls */}
                    <div className="absolute -right-2 top-0 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 bg-background rounded-lg border border-border p-1 shadow-sm">
                      <button
                        onClick={() => updateBlockAlignment(block.id, "left")}
                        className={`p-1 rounded ${alignment === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => updateBlockAlignment(block.id, "center")}
                        className={`p-1 rounded ${alignment === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignCenter className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => updateBlockAlignment(block.id, "right")}
                        className={`p-1 rounded ${alignment === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignRight className="h-3 w-3" />
                      </button>
                      {block.type === "button" && (
                        <button
                          onClick={() => updateBlockAlignment(block.id, "full")}
                          className={`p-1 rounded ${alignment === "full" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Block content */}
                    {block.type === "youtube" && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${block.content.videoId}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {block.type === "image" && (
                      <div className={`flex ${flexAlignClass}`}>
                        <img 
                          src={block.content.url} 
                          alt="Block" 
                          className="rounded-xl max-w-full"
                          style={{ 
                            borderRadius: block.content.cornerRadius === "small" ? "8px" : block.content.cornerRadius === "large" ? "20px" : "12px"
                          }}
                        />
                      </div>
                    )}
                    {block.type === "text" && (
                      <div className={`space-y-1 ${textAlignClass}`}>
                        <h3 className="font-semibold text-foreground">{block.content.title}</h3>
                        {block.content.body && (
                          <p className="text-sm text-muted-foreground">{block.content.body}</p>
                        )}
                      </div>
                    )}
                    {block.type === "button" && (
                      <div className={`flex ${alignment === "full" ? "" : flexAlignClass}`}>
                        <a
                          href={block.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`py-4 px-6 bg-primary text-primary-foreground rounded-xl text-center font-semibold hover:bg-primary/90 transition-colors ${
                            alignment === "full" ? "w-full" : ""
                          }`}
                        >
                          {block.content.label}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Your TapAway card</Label>
        <TapAwayCardPreview
          fullName={formData.fullName}
          username={formData.username}
          profilePhotoUrl={formData.profilePhotoUrl}
          cardHeadline={formData.cardHeadline}
        />
      </div>

      {/* Extra Card Option */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
        <div>
          <p className="font-medium text-foreground">Add an extra card</p>
          <p className="text-sm text-muted-foreground">+$10 one-time</p>
        </div>
        <Switch
          checked={formData.addExtraCard}
          onCheckedChange={(checked) => updateFormData({ addExtraCard: checked, extraCardCount: checked ? 1 : 0 })}
        />
      </div>

      {/* Extra card quantity */}
      {formData.addExtraCard && (
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Extra cards</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateFormData({ extraCardCount: Math.max(1, formData.extraCardCount - 1) })}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              -
            </button>
            <span className="font-medium w-6 text-center">{formData.extraCardCount}</span>
            <button
              onClick={() => updateFormData({ extraCardCount: Math.min(10, formData.extraCardCount + 1) })}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Shipping Note */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Truck className="h-4 w-4" />
        <span>Free shipping • Ships in 1–2 business days</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-14"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 h-14 text-base font-semibold"
        >
          Continue to checkout
        </Button>
      </div>
    </div>
  );
};
