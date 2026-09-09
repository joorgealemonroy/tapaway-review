import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink, PersonalBlock, ContentItem } from "@/hooks/usePersonalOnboarding";
import { toast } from "sonner";
import { PERSONAL_PLANS } from "@/lib/personalPlanLimits";
import { 
  Plus, 
  GripVertical,
  Trash2,
  Camera,
  Loader2,
  ArrowLeft,
  Edit,
  Palette,
  Sparkles,
  Eye,
  Youtube,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  SkipForward,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LinkModal } from "@/components/personal/LinkModal";
import { BlockModal } from "@/components/personal/BlockModal";
import { useTouchHoldDrag } from "@/hooks/useTouchHoldDrag";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { HeaderCustomizer } from "@/components/personal/HeaderCustomizer";
import { ProfilePreviewPanel } from "@/components/personal/ProfilePreviewPanel";
import { getPlatformConfig } from "@/lib/platformLinks";
import { extractBottomColor } from "@/lib/imageColorExtraction";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  addLink: (link: Omit<PersonalLink, "id">) => void;
  updateLink: (id: string, updates: Partial<PersonalLink>) => void;
  removeLink: (id: string) => void;
  reorderLinks: (links: PersonalLink[]) => void;
  addBlock: (block: Omit<PersonalBlock, "id" | "sortOrder">) => void;
  updateBlock: (id: string, updates: Partial<PersonalBlock>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (blocks: PersonalBlock[]) => void;
  reorderContent: (items: ContentItem[]) => void;
  selectedTemplate?: string | null;
}

const getBlockIcon = (type: string) => {
  switch (type) {
    case "youtube": return Youtube;
    case "image": return ImageIcon;
    case "text": return Type;
    case "button": return MousePointerClick;
    default: return Type;
  }
};

const getBlockLabel = (block: PersonalBlock) => {
  switch (block.type) {
    case "youtube": return block.content.url || "YouTube Video";
    case "image": return "Image";
    case "text": return block.content.title || "Text Block";
    case "button": return block.content.label || "Button";
    default: return "Block";
  }
};

const SUB_STEPS = [
  { title: "Add your photo", description: "Upload a photo and write a headline" },
  { title: "Fill in your links", description: "Add your social links and content blocks" },
  { title: "Pick your style", description: "Customize colors and header" },
];

export const LinksStep = ({ 
  formData, 
  updateFormData, 
  onNext, 
  onBack, 
  isLoading, 
  setIsLoading,
  addLink,
  updateLink,
  removeLink,
  reorderLinks,
  addBlock,
  updateBlock,
  removeBlock,
  reorderBlocks,
  reorderContent,
  selectedTemplate,
}: Props) => {
  const [subStep, setSubStep] = useState(formData.profilePhotoUrl ? 2 : 1);
  const totalSubSteps = 3;

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [deleteId, setDeleteId] = useState<{ id: string; kind: "link" | "block" } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("");
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [activeLinkIndex, setActiveLinkIndex] = useState(0);
  const [showListView, setShowListView] = useState(false);
  const [justFilled, setJustFilled] = useState<string | null>(null);
  const focusInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedRef = useRef(false);

  const templateBannerText = useMemo(() => {
    switch (selectedTemplate) {
      case "social-star": return "Fill in your handles below — tap any link to edit";
      case "business-pro": return "Add your professional info — tap any link to edit";
      case "creative": return "Showcase your work — tap any link to edit, add images below";
      case "minimal": return "Just the essentials — tap any link to edit";
      default: return null;
    }
  }, [selectedTemplate]);

  // Social link types for grouping
  const SOCIAL_TYPES = useMemo(() => new Set([
    "instagram", "tiktok", "x", "youtube", "snapchat", "facebook",
    "threads", "linkedin", "pinterest", "discord", "twitch", "telegram",
    "whatsapp", "spotify", "applemusic", "soundcloud", "bandcamp",
  ]), []);

  // Ordered items for carousel: socials first, then action links, then blocks
  const carouselItems = useMemo(() => {
    const socials = formData.links.filter(l => SOCIAL_TYPES.has(l.type));
    const actions = formData.links.filter(l => !SOCIAL_TYPES.has(l.type));
    const blocks = formData.blocks;
    return [
      ...socials.map((item): { kind: "link" | "block"; item: PersonalLink | PersonalBlock; group: string } => ({ kind: "link", item, group: "Socials" })),
      ...actions.map((item): { kind: "link" | "block"; item: PersonalLink | PersonalBlock; group: string } => ({ kind: "link", item, group: "Links & Buttons" })),
      ...blocks.map((item): { kind: "link" | "block"; item: PersonalLink | PersonalBlock; group: string } => ({ kind: "block", item, group: "Content Blocks" })),
    ];
  }, [formData.links, formData.blocks, SOCIAL_TYPES]);

  // Focus the input when activeLinkIndex changes
  useEffect(() => {
    if (subStep === 2 && !showListView) {
      setTimeout(() => focusInputRef.current?.focus(), 100);
    }
  }, [activeLinkIndex, subStep, showListView]);

  // Clamp activeLinkIndex if items are removed
  useEffect(() => {
    if (activeLinkIndex >= carouselItems.length && carouselItems.length > 0) {
      setActiveLinkIndex(carouselItems.length - 1);
    }
  }, [carouselItems.length, activeLinkIndex]);

  const isFreePlan = formData.planType === "free";
  const maxFreeLinks = PERSONAL_PLANS.paid.maxLinks;

  const checkProFeature = (featureName: string): boolean => {
    if (!isFreePlan) return true;
    setUpgradeFeatureName(featureName);
    setUpgradeDialogOpen(true);
    return false;
  };

  const handleUpgradeToPro = () => {
    updateFormData({ planType: "yearly" });
    setUpgradeDialogOpen(false);
    toast.success("Upgraded to Pro!");
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image must be less than 20MB"); return; }

    setUploadingPhoto(true);
    try {
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url; });
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height / width) * maxDim; width = maxDim; } else { width = (width / height) * maxDim; height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const blob = await new Promise<Blob>((resolve) => { canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85); });
        processedFile = new File([blob], file.name, { type: "image/jpeg" });
        URL.revokeObjectURL(url);
      }
      updateFormData({ profilePhoto: processedFile });
      setRawImageUrl(URL.createObjectURL(processedFile));
      setCropperOpen(true);
    } catch (err) {
      console.error("Error processing image:", err);
      toast.error("Failed to process image");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob, previewUrl: string) => {
    updateFormData({ croppedPhotoBlob: croppedBlob, profilePhotoUrl: previewUrl });
    toast.success("Photo added!");
    try {
      const color = await extractBottomColor(previewUrl);
      if (color && color !== "#1a1a1a") {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          
          // Compute relative luminance (0 = black, 1 = white)
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          
          updateFormData({ headerColor: hex });
          
          // If the extracted color is very light, auto-set a dark background to prevent white-on-white
          if (luminance > 0.7) {
            const currentBg = formData.backgroundColor || "#000000";
            const bgMatch = currentBg.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (bgMatch) {
              const bgLum = (0.299 * parseInt(bgMatch[1], 16) + 0.587 * parseInt(bgMatch[2], 16) + 0.114 * parseInt(bgMatch[3], 16)) / 255;
              if (bgLum > 0.7) {
                updateFormData({ backgroundColor: "#1a1a2e" });
                toast("Background auto-darkened for readability", { icon: "🎨" });
              }
            }
          }
          
          toast.success("Style color matched to your photo");
        }
      }
    } catch { /* keep default */ }
  };

  const unifiedContent: ContentItem[] = useMemo(() => [
    ...formData.links.map((link): ContentItem => ({ kind: "link", item: link })),
    ...formData.blocks.map((block): ContentItem => ({ kind: "block", item: block })),
  ].sort((a, b) => {
    const aOrder = a.kind === "link" ? (a.item.sortOrder ?? 0) : a.item.sortOrder;
    const bOrder = b.kind === "link" ? (b.item.sortOrder ?? 0) : b.item.sortOrder;
    return aOrder - bOrder;
  }), [formData.links, formData.blocks]);

  const {
    draggedIndex, handleTouchStart, handleTouchMove, handleTouchEnd,
    handleDragStart, handleDragOver, handleDragEnd,
  } = useTouchHoldDrag({ items: unifiedContent, onReorder: reorderContent, itemHeight: 64 });

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    if (deleteId.kind === "link") removeLink(deleteId.id); else removeBlock(deleteId.id);
    setDeleteId(null);
  };

  // --- Preview data ---
  const previewProfile = {
    id: "preview", full_name: formData.fullName, username: formData.username,
    headline: formData.cardHeadline || null, bio: null,
    profile_photo_url: formData.profilePhotoUrl || null,
    header_type: formData.headerType || "color",
    header_color: formData.headerColor || "#6BCB77",
    header_image_url: formData.headerImageUrl || null,
    background_color: formData.backgroundColor || "#000000",
    pfp_position: "center",
  };
  const previewLinks = formData.links.map((link, i) => ({
    id: link.id, label: link.label, url: link.url, link_type: link.type,
    is_active: true, is_featured: link.isFeatured || false, sort_order: link.sortOrder ?? i,
    pill_color: link.pillColor || null, display_style: link.displayStyle || "pill",
    cover_image_url: link.coverImageUrl || null, grid_size: link.gridSize || null,
    thumbnail_url: link.thumbnailUrl || null,
  }));
  const previewBlocks = formData.blocks.map((block) => ({
    id: block.id, block_type: block.type, content: block.content as Record<string, unknown>,
    is_active: true, sort_order: block.sortOrder,
    alignment: (block.content.alignment as string) || null,
  }));

  const existingTypes = formData.links.map(l => l.type);
  const canProceedStep1 = formData.profilePhotoUrl !== null;

  // --- Navigation ---
  const handleSubStepBack = () => {
    if (subStep > 1) setSubStep(s => s - 1);
    else onBack();
  };

  const handleSubStepNext = () => {
    if (subStep < totalSubSteps) setSubStep(s => s + 1);
    else onNext();
  };

  const progressPercent = (subStep / totalSubSteps) * 100;

  // --- Render sub-step content ---
  const renderSubStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative h-24 w-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden group flex-shrink-0"
          disabled={uploadingPhoto}
        >
          {formData.profilePhotoUrl ? (
            <img src={formData.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1">
              {uploadingPhoto ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-muted-foreground">Upload</span>
                </>
              )}
            </div>
          )}
          {formData.profilePhotoUrl && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
          )}
        </button>
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Headline</Label>
            <Input
              value={formData.cardHeadline || ""}
              onChange={(e) => updateFormData({ cardHeadline: e.target.value })}
              placeholder="e.g. Photographer 📸"
              className="h-11"
            />
          </div>
          {!formData.profilePhotoUrl && (
            <p className="text-xs text-destructive">A profile photo is required to continue</p>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
    </div>
  );

  const handleCarouselLinkUpdate = useCallback((id: string, value: string) => {
    const link = formData.links.find(l => l.id === id);
    if (!link) return;
    const config = getPlatformConfig(link.type);
    const url = config?.generateUrl ? config.generateUrl(value) : value;
    updateLink(id, { value, url });
    setJustFilled(id);
    // Auto-advance after brief delay
    setTimeout(() => {
      setJustFilled(null);
      if (activeLinkIndex < carouselItems.length - 1) {
        setActiveLinkIndex(i => i + 1);
      }
    }, 500);
  }, [formData.links, updateLink, activeLinkIndex, carouselItems.length]);

  const handleCarouselBlockUpdate = useCallback((id: string, key: string, value: string) => {
    const block = formData.blocks.find(b => b.id === id);
    if (!block) return;
    updateBlock(id, { content: { ...block.content, [key]: value } });
  }, [formData.blocks, updateBlock]);

  const renderSubStep2 = () => {
    // If user toggled to list view, show the old management UI
    if (showListView) {
      return (
        <div className="space-y-3">
          {unifiedContent.length > 0 && (
            <div className="space-y-2">
              {unifiedContent.map((ci, index) => {
                if (ci.kind === "link") {
                  const link = ci.item as PersonalLink;
                  const config = getPlatformConfig(link.type);
                  const Icon = config?.icon;
                  const isEmpty = !link.value;
                  return (
                    <div
                      key={`link-${link.id}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={isEmpty ? () => { setEditingLink(link); setLinkModalOpen(true); } : undefined}
                      className={`flex items-center gap-3 p-3 min-h-[52px] bg-card rounded-xl border cursor-move transition-all select-none ${
                        draggedIndex === index ? "opacity-50 scale-95" : ""
                      } ${isEmpty ? "border-dashed border-amber-400/60" : "border-border"}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${config?.gradient || config?.bgColor || "bg-primary/10"}`}>
                        {Icon && <Icon className={`h-4 w-4 ${config?.color || "text-primary"}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{link.label}</p>
                        {isEmpty && link.placeholder ? (
                          <p className="text-xs text-amber-500/80 italic truncate">{link.placeholder} — tap to fill in</p>
                        ) : (
                          <p className="text-xs text-muted-foreground truncate">{link.value}</p>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setEditingLink(link); setLinkModalOpen(true); }} className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId({ id: link.id, kind: "link" }); }} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  );
                } else {
                  const block = ci.item as PersonalBlock;
                  const BlockIcon = getBlockIcon(block.type);
                  return (
                    <div
                      key={`block-${block.id}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`flex items-center gap-3 p-3 min-h-[52px] bg-card rounded-xl border border-border cursor-move transition-all select-none ${
                        draggedIndex === index ? "opacity-50 scale-95" : ""
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <BlockIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{getBlockLabel(block)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{block.type} block</p>
                      </div>
                      <button onClick={() => { setEditingBlock(block); setBlockModalOpen(true); }} className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteId({ id: block.id, kind: "block" })} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  );
                }
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isFreePlan && formData.links.length >= maxFreeLinks) { checkProFeature("unlimited links"); return; }
                setEditingLink(null); setLinkModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Add link</span>
            </button>
            <button
              onClick={() => { setEditingBlock(null); setBlockModalOpen(true); }}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Add block</span>
            </button>
          </div>
          <button onClick={() => setShowListView(false)} className="text-xs text-primary hover:underline mx-auto block">
            ← Back to guided view
          </button>
        </div>
      );
    }

    // Empty state
    if (carouselItems.length === 0) {
      return (
        <div className="space-y-4 text-center py-6">
          <p className="text-sm text-muted-foreground">No links yet — add your first one!</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => { setEditingLink(null); setLinkModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add link
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditingBlock(null); setBlockModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add block
            </Button>
          </div>
        </div>
      );
    }

    const current = carouselItems[activeLinkIndex];
    const totalItems = carouselItems.length;
    const filledCount = carouselItems.filter(ci => {
      if (ci.kind === "link") return !!(ci.item as PersonalLink).value;
      const b = ci.item as PersonalBlock;
      return !!(b.content.url || b.content.title || b.content.label);
    }).length;

    // Determine group label transition
    const currentGroup = current.group;
    const prevGroup = activeLinkIndex > 0 ? carouselItems[activeLinkIndex - 1].group : null;
    const showGroupLabel = currentGroup !== prevGroup;

    return (
      <div className="space-y-4">
        {/* Link-level progress dots */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {carouselItems.map((ci, i) => {
            const isFilled = ci.kind === "link"
              ? !!(ci.item as PersonalLink).value
              : !!((ci.item as PersonalBlock).content.url || (ci.item as PersonalBlock).content.title || (ci.item as PersonalBlock).content.label);
            const isActive = i === activeLinkIndex;
            return (
              <button
                key={i}
                onClick={() => setActiveLinkIndex(i)}
                className={`relative h-2.5 rounded-full transition-all ${
                  isActive ? "w-6 bg-primary" : isFilled ? "w-2.5 bg-primary/60" : "w-2.5 bg-muted-foreground/20"
                }`}
              >
                {isFilled && !isActive && (
                  <Check className="absolute -top-1 -right-1 h-2.5 w-2.5 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {filledCount} of {totalItems} filled
        </p>

        {/* Group label */}
        {showGroupLabel && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 text-center">
            {currentGroup}
          </p>
        )}

        {/* Focused single-input card with Framer Motion */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLinkIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
            >
          {(() => {
            if (current.kind === "link") {
              const link = current.item as PersonalLink;
              const config = getPlatformConfig(link.type);
              const Icon = config?.icon;
              const isFilled = justFilled === link.id;
              const hasImage = !!(link.coverImageUrl || link.thumbnailUrl);

              return (
                <div className={`bg-card rounded-2xl border-2 p-6 text-center space-y-4 transition-all ${
                  isFilled ? "border-primary bg-primary/5 scale-[1.02]" : "border-border"
                }`}>
                  {/* Platform icon */}
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto ${config?.gradient || config?.bgColor || "bg-primary/10"}`}>
                    {isFilled ? (
                      <Check className="h-7 w-7 text-white" />
                    ) : (
                      Icon && <Icon className={`h-7 w-7 ${config?.color || "text-primary"}`} />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-foreground">{link.label}</p>
                    {link.placeholder && (
                      <p className="text-xs text-muted-foreground mt-0.5">{link.placeholder}</p>
                    )}
                  </div>

                  {/* Inline input */}
                  <Input
                    ref={focusInputRef}
                    value={link.value || ""}
                    onChange={(e) => updateLink(link.id, { value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && link.value) {
                        handleCarouselLinkUpdate(link.id, link.value);
                      }
                    }}
                    onPaste={(e) => {
                      setTimeout(() => {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) handleCarouselLinkUpdate(link.id, val);
                      }, 50);
                    }}
                    placeholder={config?.prefix ? `${config.prefix}${config.placeholder || ""}` : link.placeholder || "Paste your link here"}
                    className="h-12 text-center text-base"
                  />

                  {/* Image upload affordance for links with image properties */}
                  {(link.displayStyle === "card" || link.displayStyle === "grid" || hasImage) && (
                    <div className="pt-1">
                      {link.coverImageUrl ? (
                        <div className="relative mx-auto w-32 h-20 rounded-lg overflow-hidden bg-muted">
                          <img src={link.coverImageUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => { setEditingLink(link); setLinkModalOpen(true); }}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Camera className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingLink(link); setLinkModalOpen(true); }}
                          className="flex items-center justify-center gap-2 mx-auto px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium text-muted-foreground transition-colors border border-dashed border-border"
                        >
                          <Camera className="h-4 w-4" />
                          Upload cover image
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            } else {
              const block = current.item as PersonalBlock;
              const BlockIcon = getBlockIcon(block.type);

              return (
                <div className="bg-card rounded-2xl border-2 border-border p-6 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <BlockIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground capitalize">{block.type} Block</p>

                  {block.type === "youtube" && (
                    <Input
                      ref={focusInputRef}
                      value={block.content.url || ""}
                      onChange={(e) => handleCarouselBlockUpdate(block.id, "url", e.target.value)}
                      placeholder="Paste YouTube URL"
                      className="h-12 text-center text-base"
                    />
                  )}
                  {block.type === "text" && (
                    <Input
                      ref={focusInputRef}
                      value={block.content.title || ""}
                      onChange={(e) => handleCarouselBlockUpdate(block.id, "title", e.target.value)}
                      placeholder="Enter text"
                      className="h-12 text-center text-base"
                    />
                  )}
                  {block.type === "button" && (
                    <div className="space-y-2">
                      <Input
                        ref={focusInputRef}
                        value={block.content.label || ""}
                        onChange={(e) => handleCarouselBlockUpdate(block.id, "label", e.target.value)}
                        placeholder="Button label"
                        className="h-12 text-center text-base"
                      />
                      <Input
                        value={block.content.url || ""}
                        onChange={(e) => handleCarouselBlockUpdate(block.id, "url", e.target.value)}
                        placeholder="Button URL"
                        className="h-11 text-center text-sm"
                      />
                    </div>
                  )}
                  {block.type === "image" && (
                    <button
                      onClick={() => { setEditingBlock(block); setBlockModalOpen(true); }}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium text-muted-foreground transition-colors border border-dashed border-border"
                    >
                      <Camera className="h-4 w-4" />
                      Upload image
                    </button>
                  )}
                </div>
              );
            }
          })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={activeLinkIndex === 0}
            onClick={() => setActiveLinkIndex(i => i - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>

          <button
            onClick={() => {
              if (activeLinkIndex < totalItems - 1) setActiveLinkIndex(i => i + 1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip link
          </button>

          <Button
            variant="ghost"
            size="sm"
            disabled={activeLinkIndex >= totalItems - 1}
            onClick={() => setActiveLinkIndex(i => i + 1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Add + Edit all actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isFreePlan && formData.links.length >= maxFreeLinks) { checkProFeature("unlimited links"); return; }
                setEditingLink(null); setLinkModalOpen(true);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add link
            </button>
            <button
              onClick={() => { setEditingBlock(null); setBlockModalOpen(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add block
            </button>
          </div>
          <button
            onClick={() => setShowListView(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <List className="h-3.5 w-3.5" /> Edit all
          </button>
        </div>
      </div>
    );
  };

  const renderSubStep3 = () => (
    <div className="space-y-4">
      <HeaderCustomizer
        headerType={formData.headerType || "color"}
        headerColor={formData.headerColor}
        headerImageUrl={formData.headerImageUrl}
        backgroundColor={formData.backgroundColor}
        onUpdate={(updates) => {
          if ((updates.headerType === "image" || updates.headerType === "banner") && isFreePlan) {
            checkProFeature(updates.headerType === "banner" ? "full banner headers" : "custom header images");
            return;
          }
          updateFormData(updates);
        }}
      />
    </div>
  );

  const currentSubStep = SUB_STEPS[subStep - 1];
  const isSkippable = subStep >= 2;
  const canContinue = subStep === 1 ? canProceedStep1 : true;

  // --- Shared preview component ---
  const previewPanel = (
    <ProfilePreviewPanel
      profile={previewProfile}
      links={previewLinks}
      blocks={previewBlocks}
    />
  );

  return (
    <div className="space-y-0">
      {/* Desktop split-pane layout */}
      <div className="flex flex-col lg:flex-row lg:gap-8">
        {/* Left: Wizard form */}
        <div className="flex-1 lg:max-w-md space-y-5">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Step {subStep} of {totalSubSteps}
              </span>
              {isSkippable && (
                <button
                  onClick={handleSubStepNext}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="h-3 w-3" />
                  Skip for now
                </button>
              )}
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Sub-step header */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{currentSubStep.title}</h3>
            <p className="text-sm text-muted-foreground">{currentSubStep.description}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2">
            {SUB_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i + 1 === subStep ? "w-6 bg-primary" : i + 1 < subStep ? "w-2 bg-primary/60" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Mobile compact preview */}
          <div className="lg:hidden relative">
            <div className="h-[260px] overflow-hidden rounded-2xl border border-border bg-muted/30 flex items-center justify-center">
              <div className="transform scale-[0.42] origin-center pointer-events-none">
                {previewPanel}
              </div>
            </div>
            <button
              onClick={() => setPreviewDrawerOpen(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-foreground text-background rounded-full text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          {/* Sub-step content */}
          <div className="min-h-[180px]">
            {subStep === 1 && renderSubStep1()}
            {subStep === 2 && renderSubStep2()}
            {subStep === 3 && renderSubStep3()}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleSubStepBack} className="h-14">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSubStepNext}
              disabled={!canContinue || isLoading}
              className="flex-1 h-14 text-base font-semibold"
            >
              {subStep === totalSubSteps ? "Continue" : "Next"}
            </Button>
          </div>
        </div>

        {/* Right: Desktop live preview */}
        <div className="hidden lg:flex lg:flex-1 lg:items-start lg:justify-center lg:sticky lg:top-8">
          <div className="pt-4">
            {previewPanel}
          </div>
        </div>
      </div>

      {/* Full-size preview drawer (mobile) */}
      <Drawer open={previewDrawerOpen} onOpenChange={setPreviewDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">Profile Preview</DrawerTitle>
          <div className="px-4 pt-2 pb-6 overflow-y-auto">
            <p className="text-sm text-muted-foreground text-center mb-4">Mobile Preview (Example Only)</p>
            {previewPanel}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Modals */}
      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={addLink}
        editingLink={editingLink}
        onUpdate={updateLink}
        existingTypes={existingTypes}
      />
      <BlockModal
        open={blockModalOpen}
        onOpenChange={(open) => { if (!open) { setBlockModalOpen(false); setEditingBlock(null); } }}
        profileId="signup-draft"
        editingBlock={editingBlock ? {
          id: editingBlock.id, block_type: editingBlock.type,
          content: editingBlock.content, sort_order: editingBlock.sortOrder,
          alignment: (editingBlock.content.alignment as string) || null,
        } : null}
        currentMaxOrder={Math.max(0, ...unifiedContent.map((ci, i) => ci.kind === "block" ? ci.item.sortOrder : (ci.item as PersonalLink).sortOrder ?? i))}
        deferSave
        onBlockSaved={(savedBlock) => {
          const converted = {
            type: savedBlock.block_type as PersonalBlock["type"],
            content: savedBlock.content as Record<string, string>,
            sortOrder: savedBlock.sort_order,
          };
          if (editingBlock) updateBlock(editingBlock.id, converted); else addBlock(converted);
          setBlockModalOpen(false); setEditingBlock(null);
        }}
      />
      {rawImageUrl && (
        <ImageCropper open={cropperOpen} onOpenChange={setCropperOpen} imageSrc={rawImageUrl} onCropComplete={handleCropComplete} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this {deleteId?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pro Feature Upgrade Dialog */}
      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              This is a Pro feature
            </AlertDialogTitle>
            <AlertDialogDescription>
              Upgrade to Pro to unlock {upgradeFeatureName}. No charge today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Maybe later</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgradeToPro} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Sparkles className="h-4 w-4 mr-2" />
              Try Pro Free for 7 Days
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
