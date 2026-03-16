import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Plus, ArrowLeft, Rocket, ImagePlus, Link2 } from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink, PersonalBlock } from "@/hooks/usePersonalOnboarding";
import { LinkModal } from "@/components/personal/LinkModal";
import { ImageCropper } from "@/components/personal/ImageCropper";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface VibeMetadata {
  name: string;
  glowColor: string;
  accentColor: string;
}

interface PersonalizeStepProps {
  formData: SignupData;
  updateLink: (id: string, updates: Partial<PersonalLink>) => void;
  removeLink: (id: string) => void;
  addLink: (link: Omit<PersonalLink, "id">) => void;
  addBlock: (block: Omit<PersonalBlock, "id"> & { sortOrder?: number }) => void;
  updateBlock: (id: string, updates: Partial<PersonalBlock>) => void;
  removeBlock: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  vibeMetadata: VibeMetadata | null;
}

const DEFAULT_PLACEHOLDERS = ["@yourname", "@yourhandle", "you@email.com", "+1 (555) 000-0000", "yoursite.com", "yourname", ""];

function isRealValue(value: string): boolean {
  const trimmed = value.trim().replace(/^@/, "");
  return trimmed !== "" && !DEFAULT_PLACEHOLDERS.includes(value.trim()) && !DEFAULT_PLACEHOLDERS.includes(trimmed);
}

// Types that use an @ prefix
const HANDLE_TYPES = new Set(["instagram", "tiktok", "x", "threads", "snapchat", "twitch"]);

export const PersonalizeStep = ({
  formData,
  updateLink,
  removeLink,
  addLink,
  addBlock,
  updateBlock,
  removeBlock,
  onNext,
  onBack,
  vibeMetadata,
}: PersonalizeStepProps) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accent = vibeMetadata?.accentColor || "hsl(var(--primary))";
  const glow = vibeMetadata?.glowColor || "transparent";

  const handleValueChange = (link: PersonalLink, newValue: string) => {
    const platform = getPlatformConfig(link.type);
    // Strip leading @ for handle types — the prefix is rendered visually
    const cleanValue = HANDLE_TYPES.has(link.type) ? newValue.replace(/^@/, "") : newValue;
    const url = platform ? platform.generateUrl(cleanValue) : cleanValue;
    updateLink(link.id, { value: cleanValue, url });
  };

  const handleAddLink = (link: Omit<PersonalLink, "id">) => {
    addLink({
      ...link,
      sortOrder: formData.links.length + formData.blocks.length,
    });
    setShowLinkModal(false);
  };

  const handleAddImageBlock = () => {
    addBlock({
      type: "image",
      content: { alt: "My Photo" },
      sortOrder: formData.links.length + formData.blocks.length,
    });
    setShowAddDrawer(false);
  };

  const handleImageFileSelect = (blockId: string) => {
    setActiveBlockId(blockId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBlockId) return;
    
    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCropComplete = (blob: Blob, previewUrl: string) => {
    if (!activeBlockId) return;
    updateBlock(activeBlockId, {
      content: { alt: "My Photo", url: previewUrl },
    });
    setCropperOpen(false);
  };

  // Image blocks from formData
  const imageBlocks = formData.blocks.filter((b) => b.type === "image");

  return (
    <div className="relative">
      {/* Vibe glow background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${glow}26, transparent 70%)`,
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Link inputs */}
      <div className="space-y-3">
        {formData.links.map((link, index) => {
          const platform = getPlatformConfig(link.type);
          const Icon = platform?.icon;
          const isHandle = HANDLE_TYPES.has(link.type);
          const hasReal = isRealValue(link.value);
          // Display value without @ prefix for handle types (shown separately)
          const displayValue = link.value.replace(/^@/, "");

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 bg-card rounded-xl border border-border p-3"
            >
              {/* Platform icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: platform?.bgColor || "hsl(var(--muted))" }}>
                {Icon && <Icon className="h-4 w-4" style={{ color: platform?.color }} />}
              </div>

              {/* Input with optional @ prefix */}
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-0.5 block">
                  {platform?.label || link.label}
                </label>
                <div className="flex items-center">
                  {isHandle && (
                    <span className="text-sm text-muted-foreground/50 select-none mr-0.5 font-medium">@</span>
                  )}
                  <Input
                    value={displayValue}
                    onChange={(e) => handleValueChange(link, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={platform?.placeholder || link.placeholder || ""}
                    className={`h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      !hasReal ? "opacity-50" : ""
                    }`}
                    style={{ caretColor: accent }}
                  />
                </div>
              </div>

              {/* Status / Skip */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {hasReal && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-500/15">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </div>
                )}
                <button
                  onClick={() => removeLink(link.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                  aria-label={`Skip ${platform?.label || link.label}`}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Image blocks */}
      {imageBlocks.length > 0 && (
        <div className="space-y-3 mt-3">
          {imageBlocks.map((block) => {
            const hasImage = !!(block.content as any)?.url;
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-card rounded-xl border border-border overflow-hidden"
              >
                {hasImage ? (
                  <div className="relative">
                    <img
                      src={(block.content as any).url}
                      alt={(block.content as any).alt || "Photo"}
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => handleImageFileSelect(block.id)}
                      className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-background transition-colors"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleImageFileSelect(block.id)}
                    className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl hover:border-muted-foreground/30 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground/60">Add a Picture</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add another block */}
      <button
        onClick={() => setShowAddDrawer(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors w-full justify-center py-2"
      >
        <Plus className="h-4 w-4" />
        Add another block
      </button>

      {/* Launch CTA */}
      <Button
        onClick={onNext}
        className="w-full h-14 text-lg font-bold mt-8 rounded-2xl shadow-lg transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: accent,
          color: "#fff",
          boxShadow: `0 8px 30px -8px ${accent}80`,
        }}
      >
        <Rocket className="h-5 w-5 mr-2" />
        Continue
      </Button>

      {formData.links.length === 0 && formData.blocks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          You can always add links later from your dashboard.
        </p>
      )}

      {/* Add Block Drawer */}
      <Drawer open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add a block</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 space-y-2">
            <button
              onClick={() => {
                setShowAddDrawer(false);
                setShowLinkModal(true);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Add a Link</p>
                <p className="text-xs text-muted-foreground">Instagram, TikTok, Website…</p>
              </div>
            </button>
            <button
              onClick={handleAddImageBlock}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImagePlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Add a Picture Block</p>
                <p className="text-xs text-muted-foreground">Feature a photo on your hub</p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Link Modal */}
      <LinkModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        onAdd={handleAddLink}
        existingTypes={formData.links.map((l) => l.type)}
      />

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
        cropShape="rect"
      />
    </div>
  );
};
