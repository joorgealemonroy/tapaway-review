import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Plus, ArrowLeft, Rocket, ImagePlus, Link2, Type, Youtube, MousePointerClick, Camera } from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink, PersonalBlock } from "@/hooks/usePersonalOnboarding";
import { LinkModal } from "@/components/personal/LinkModal";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  updateFormData: (updates: Partial<SignupData>) => void;
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

// Types that use an @ prefix
const HANDLE_TYPES = new Set(["instagram", "tiktok", "x", "threads", "snapchat", "twitch"]);

export const PersonalizeStep = ({
  formData,
  updateFormData,
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
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const blockFileInputRef = useRef<HTMLInputElement>(null);
  const linkFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState("");
  const accent = vibeMetadata?.accentColor || "hsl(var(--primary))";
  const glow = vibeMetadata?.glowColor || "transparent";

  const handleValueChange = (link: PersonalLink, newValue: string) => {
    const platform = getPlatformConfig(link.type);
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

  // --- Image upload to Supabase Storage (immediate) ---
  const uploadToStorage = async (blob: Blob): Promise<string | null> => {
    setUploading(true);
    try {
      const fileName = `temp/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("personal-link-images")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (error) {
        toast.error("Image upload failed. Please try again.");
        return null;
      }
      const { data: { publicUrl } } = supabase.storage
        .from("personal-link-images")
        .getPublicUrl(fileName);
      return publicUrl;
    } catch {
      toast.error("Image upload failed.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // --- Block image handling ---
  const handleBlockImageSelect = (blockId: string) => {
    setActiveBlockId(blockId);
    setActiveLinkId(null);
    blockFileInputRef.current?.click();
  };

  const handleBlockFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => { setCropperImageSrc(reader.result as string); setCropperOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // --- Half-width link cover image handling ---
  const handleLinkImageSelect = (linkId: string) => {
    setActiveLinkId(linkId);
    setActiveBlockId(null);
    linkFileInputRef.current?.click();
  };

  const handleLinkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => { setCropperImageSrc(reader.result as string); setCropperOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    const publicUrl = await uploadToStorage(blob);
    if (!publicUrl) { setCropperOpen(false); return; }

    if (activeBlockId) {
      updateBlock(activeBlockId, { content: { alt: "My Photo", url: publicUrl } });
    } else if (activeLinkId) {
      updateLink(activeLinkId, { coverImageUrl: publicUrl });
    }
    setCropperOpen(false);
  };

  // --- Avatar handling ---
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatarCropSrc(reader.result as string); setAvatarCropOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAvatarCropComplete = async (blob: Blob) => {
    const publicUrl = await uploadToStorage(blob);
    if (!publicUrl) { setAvatarCropOpen(false); return; }
    updateFormData({ profilePhotoUrl: publicUrl });
    setAvatarCropOpen(false);
  };

  // --- Add block helpers ---
  const handleAddImageBlock = () => {
    addBlock({ type: "image", content: { alt: "My Photo" }, sortOrder: formData.links.length + formData.blocks.length });
    setShowAddDrawer(false);
  };
  const handleAddTextBlock = () => {
    addBlock({ type: "text", content: { title: "", body: "" }, sortOrder: formData.links.length + formData.blocks.length });
    setShowAddDrawer(false);
  };
  const handleAddYoutubeBlock = () => {
    addBlock({ type: "youtube", content: { url: "" }, sortOrder: formData.links.length + formData.blocks.length });
    setShowAddDrawer(false);
  };
  const handleAddButtonBlock = () => {
    addBlock({ type: "button", content: { label: "", url: "" }, sortOrder: formData.links.length + formData.blocks.length });
    setShowAddDrawer(false);
  };

  const imageBlocks = formData.blocks.filter((b) => b.type === "image");
  const textBlocks = formData.blocks.filter((b) => b.type === "text");
  const youtubeBlocks = formData.blocks.filter((b) => b.type === "youtube");
  const buttonBlocks = formData.blocks.filter((b) => b.type === "button");

  return (
    <div className="relative">
      {/* Vibe glow background */}
      <div className="fixed inset-0 pointer-events-none -z-10" style={{ background: `radial-gradient(ellipse at 50% 30%, ${glow}26, transparent 70%)` }} />

      {/* Hidden file inputs */}
      <input ref={blockFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBlockFileChange} />
      <input ref={linkFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLinkFileChange} />

      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Link inputs */}
      <div className="space-y-3">
        {formData.links.map((link, index) => {
          const platform = getPlatformConfig(link.type);
          const Icon = platform?.icon;
          const isHandle = HANDLE_TYPES.has(link.type);
          const hasReal = (link.value || "").trim() !== "";
          const displayValue = (link.value || "").replace(/^@/, "");
          const isHalf = link.gridSize === "half";

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-2">
                {/* Platform icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: platform?.bgColor || "hsl(var(--muted))" }}>
                  {Icon && <Icon className="h-4 w-4" style={{ color: platform?.color }} />}
                </div>

                {/* Input */}
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground mb-0.5 block">
                    {platform?.label || link.label}
                  </label>
                  <div className="flex items-center">
                    {isHandle && <span className="text-sm text-muted-foreground/50 select-none mr-0.5 font-medium">@</span>}
                    <Input
                      value={displayValue}
                      onChange={(e) => handleValueChange(link, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder={platform?.placeholder || link.placeholder || ""}
                      className={`h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${!hasReal ? "opacity-50" : ""}`}
                      style={{ caretColor: accent }}
                    />
                  </div>
                </div>

                {/* Status / Remove */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {hasReal && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-500/15">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    </div>
                  )}
                  <button onClick={() => removeLink(link.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors" aria-label={`Remove ${platform?.label || link.label}`}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Half-width cover image upload */}
              {isHalf && (
                <div className="mt-2">
                  {link.coverImageUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={link.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      <button onClick={() => handleLinkImageSelect(link.id)} className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Change</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLinkImageSelect(link.id)}
                      disabled={uploading}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/30 transition-colors"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/50">Cover</span>
                    </button>
                  )}
                </div>
              )}
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
              <motion.div key={block.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-xl border border-border overflow-hidden">
                {hasImage ? (
                  <div className="relative">
                    <img src={(block.content as any).url} alt={(block.content as any).alt || "Photo"} className="w-full h-40 object-cover" />
                    <button onClick={() => handleBlockImageSelect(block.id)} className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-background transition-colors">Change</button>
                    <button onClick={() => removeBlock(block.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/10 transition-colors">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleBlockImageSelect(block.id)} disabled={uploading} className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl hover:border-muted-foreground/30 transition-colors">
                    <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground/60">{uploading ? "Uploading…" : "Add a Picture"}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Text blocks */}
      {textBlocks.length > 0 && (
        <div className="space-y-3 mt-3">
          {textBlocks.map((block) => (
            <motion.div key={block.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Text Block</span>
                <button onClick={() => removeBlock(block.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <Input
                value={(block.content as any)?.title || ""}
                onChange={(e) => updateBlock(block.id, { content: { ...block.content, title: e.target.value } })}
                placeholder="Heading (optional)"
                className="text-sm"
              />
              <Textarea
                value={(block.content as any)?.body || ""}
                onChange={(e) => updateBlock(block.id, { content: { ...block.content, body: e.target.value } })}
                placeholder="Write something…"
                className="text-sm min-h-[60px]"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* YouTube blocks */}
      {youtubeBlocks.length > 0 && (
        <div className="space-y-3 mt-3">
          {youtubeBlocks.map((block) => (
            <motion.div key={block.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">YouTube Video</span>
                <button onClick={() => removeBlock(block.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <Input
                value={(block.content as any)?.url || ""}
                onChange={(e) => updateBlock(block.id, { content: { ...block.content, url: e.target.value } })}
                placeholder="https://youtube.com/watch?v=..."
                className="text-sm"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Button blocks */}
      {buttonBlocks.length > 0 && (
        <div className="space-y-3 mt-3">
          {buttonBlocks.map((block) => (
            <motion.div key={block.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Featured Button</span>
                <button onClick={() => removeBlock(block.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <Input
                value={(block.content as any)?.label || ""}
                onChange={(e) => updateBlock(block.id, { content: { ...block.content, label: e.target.value } })}
                placeholder="Button text"
                className="text-sm"
              />
              <Input
                value={(block.content as any)?.url || ""}
                onChange={(e) => updateBlock(block.id, { content: { ...block.content, url: e.target.value } })}
                placeholder="https://..."
                className="text-sm"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Add another block */}
      <button onClick={() => setShowAddDrawer(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors w-full justify-center py-2">
        <Plus className="h-4 w-4" /> Add another block
      </button>

      {/* Launch CTA */}
      <Button
        onClick={onNext}
        disabled={uploading}
        className="w-full h-14 text-lg font-bold mt-8 rounded-2xl shadow-lg transition-all hover:scale-[1.02]"
        style={{ backgroundColor: accent, color: "#fff", boxShadow: `0 8px 30px -8px ${accent}80` }}
      >
        <Rocket className="h-5 w-5 mr-2" />
        {uploading ? "Uploading…" : "Continue"}
      </Button>

      {formData.links.length === 0 && formData.blocks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">You can always add links later from your dashboard.</p>
      )}

      {/* Add Block Drawer */}
      <Drawer open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add a block</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 space-y-2">
            <button onClick={() => { setShowAddDrawer(false); setShowLinkModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Link2 className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-sm">Link</p><p className="text-xs text-muted-foreground">Standard URL block</p></div>
            </button>
            <button onClick={handleAddImageBlock} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ImagePlus className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-sm">Image</p><p className="text-xs text-muted-foreground">Upload a photo</p></div>
            </button>
            <button onClick={handleAddYoutubeBlock} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Youtube className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-sm">YouTube Video</p><p className="text-xs text-muted-foreground">Embed a video</p></div>
            </button>
            <button onClick={handleAddTextBlock} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Type className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-sm">Text</p><p className="text-xs text-muted-foreground">Title and body text</p></div>
            </button>
            <button onClick={handleAddButtonBlock} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MousePointerClick className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium text-sm">Featured Button</p><p className="text-xs text-muted-foreground">Big CTA button</p></div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Link Modal */}
      <LinkModal open={showLinkModal} onOpenChange={setShowLinkModal} onAdd={handleAddLink} existingTypes={formData.links.map((l) => l.type)} />

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={activeLinkId ? 1 : 16 / 9}
        cropShape={activeLinkId ? "round" : "rect"}
      />
    </div>
  );
};
