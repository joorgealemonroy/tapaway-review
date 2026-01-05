import { useState, useRef } from "react";
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
  
  // Drag state for links
  const [draggedLinkIndex, setDraggedLinkIndex] = useState<number | null>(null);
  const [linkTouchStart, setLinkTouchStart] = useState<{ index: number; y: number } | null>(null);
  const linkRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Drag state for blocks
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [blockTouchStart, setBlockTouchStart] = useState<{ index: number; y: number } | null>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Link drag handlers (mouse)
  const handleLinkDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLinkIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleLinkDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedLinkIndex === null || draggedLinkIndex === index) return;

    const newLinks = [...formData.links];
    const [draggedLink] = newLinks.splice(draggedLinkIndex, 1);
    newLinks.splice(index, 0, draggedLink);
    
    updateFormData({ links: newLinks });
    setDraggedLinkIndex(index);
  };

  const handleLinkDragEnd = () => {
    setDraggedLinkIndex(null);
  };

  // Link touch handlers (mobile hold-and-drag)
  const handleLinkTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setLinkTouchStart({ index, y: touch.clientY });
  };

  const handleLinkTouchMove = (e: React.TouchEvent, currentIndex: number) => {
    if (!linkTouchStart) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - linkTouchStart.y;
    
    // Only start dragging after a threshold
    if (Math.abs(deltaY) < 20) return;
    
    setDraggedLinkIndex(linkTouchStart.index);
    
    // Find which element we're over
    const targetIndex = linkRefs.current.findIndex((ref, i) => {
      if (!ref || i === linkTouchStart.index) return false;
      const rect = ref.getBoundingClientRect();
      return touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    });
    
    if (targetIndex !== -1 && targetIndex !== linkTouchStart.index) {
      const newLinks = [...formData.links];
      const [draggedLink] = newLinks.splice(linkTouchStart.index, 1);
      newLinks.splice(targetIndex, 0, draggedLink);
      updateFormData({ links: newLinks });
      setLinkTouchStart({ ...linkTouchStart, index: targetIndex });
    }
  };

  const handleLinkTouchEnd = () => {
    setLinkTouchStart(null);
    setDraggedLinkIndex(null);
  };

  // Block drag handlers (mouse)
  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBlockIndex(index);
    e.dataTransfer.effectAllowed = "move";
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

  // Block touch handlers (mobile hold-and-drag)
  const handleBlockTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setBlockTouchStart({ index, y: touch.clientY });
  };

  const handleBlockTouchMove = (e: React.TouchEvent) => {
    if (!blockTouchStart) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - blockTouchStart.y;
    
    if (Math.abs(deltaY) < 20) return;
    
    setDraggedBlockIndex(blockTouchStart.index);
    
    const targetIndex = blockRefs.current.findIndex((ref, i) => {
      if (!ref || i === blockTouchStart.index) return false;
      const rect = ref.getBoundingClientRect();
      return touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    });
    
    if (targetIndex !== -1 && targetIndex !== blockTouchStart.index) {
      const newBlocks = [...formData.blocks];
      const [draggedBlock] = newBlocks.splice(blockTouchStart.index, 1);
      newBlocks.splice(targetIndex, 0, draggedBlock);
      updateFormData({ blocks: newBlocks.map((b, i) => ({ ...b, sortOrder: i })) });
      setBlockTouchStart({ ...blockTouchStart, index: targetIndex });
    }
  };

  const handleBlockTouchEnd = () => {
    setBlockTouchStart(null);
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

      {/* Reorder hint */}
      <p className="text-xs text-muted-foreground text-center">
        Hold and drag links or blocks to reorder them
      </p>

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

          {/* Links - Draggable */}
          {formData.links.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.links.map((link, index) => {
                const config = getPlatformConfig(link.type);
                const Icon = config?.icon;
                
                return (
                  <div
                    key={link.id}
                    ref={(el) => (linkRefs.current[index] = el)}
                    draggable
                    onDragStart={(e) => handleLinkDragStart(e, index)}
                    onDragOver={(e) => handleLinkDragOver(e, index)}
                    onDragEnd={handleLinkDragEnd}
                    onTouchStart={(e) => handleLinkTouchStart(e, index)}
                    onTouchMove={(e) => handleLinkTouchMove(e, index)}
                    onTouchEnd={handleLinkTouchEnd}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none ${
                      config?.gradient || config?.bgColor || "bg-muted/50"
                    } ${draggedLinkIndex === index ? "opacity-50 scale-95 shadow-lg" : "hover:scale-[1.01]"}`}
                  >
                    {Icon && <Icon className={`h-5 w-5 ${config?.color || "text-foreground"}`} />}
                    <span className={`text-sm font-medium flex-1 ${config?.color || "text-foreground"}`}>
                      {link.label}
                    </span>
                    <ExternalLink className={`h-4 w-4 ${config?.color || "text-foreground"} opacity-60`} />
                  </div>
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
                    ref={(el) => (blockRefs.current[index] = el)}
                    draggable
                    onDragStart={(e) => handleBlockDragStart(e, index)}
                    onDragOver={(e) => handleBlockDragOver(e, index)}
                    onDragEnd={handleBlockDragEnd}
                    onTouchStart={(e) => handleBlockTouchStart(e, index)}
                    onTouchMove={handleBlockTouchMove}
                    onTouchEnd={handleBlockTouchEnd}
                    className={`relative group transition-all cursor-grab active:cursor-grabbing select-none ${
                      draggedBlockIndex === index ? "opacity-50 scale-95 shadow-lg" : ""
                    }`}
                  >
                    {/* Alignment controls - show on hover/focus */}
                    <div className="absolute -right-1 top-0 translate-x-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col gap-0.5 bg-background rounded-lg border border-border p-1 shadow-sm z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateBlockAlignment(block.id, "left"); }}
                        className={`p-1.5 rounded ${alignment === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateBlockAlignment(block.id, "center"); }}
                        className={`p-1.5 rounded ${alignment === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignCenter className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateBlockAlignment(block.id, "right"); }}
                        className={`p-1.5 rounded ${alignment === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <AlignRight className="h-3 w-3" />
                      </button>
                      {block.type === "button" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateBlockAlignment(block.id, "full"); }}
                          className={`p-1.5 rounded ${alignment === "full" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Block content */}
                    {block.type === "youtube" && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-black pointer-events-none">
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
                          className="rounded-xl max-w-full pointer-events-none"
                          style={{ 
                            borderRadius: block.content.cornerRadius === "small" ? "8px" : block.content.cornerRadius === "large" ? "20px" : "12px"
                          }}
                        />
                      </div>
                    )}
                    {block.type === "text" && (
                      <div className={`space-y-1 ${textAlignClass} p-2 rounded-lg hover:bg-muted/30`}>
                        <h3 className="font-semibold text-foreground">{block.content.title}</h3>
                        {block.content.body && (
                          <p className="text-sm text-muted-foreground">{block.content.body}</p>
                        )}
                      </div>
                    )}
                    {block.type === "button" && (
                      <div className={`flex ${alignment === "full" ? "" : flexAlignClass} p-1 rounded-lg hover:bg-muted/30`}>
                        <span
                          className={`py-4 px-6 bg-primary text-primary-foreground rounded-xl text-center font-semibold pointer-events-none ${
                            alignment === "full" ? "w-full" : ""
                          }`}
                        >
                          {block.content.label}
                        </span>
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
