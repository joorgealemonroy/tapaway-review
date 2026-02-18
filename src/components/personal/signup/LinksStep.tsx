import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink, PersonalBlock } from "@/hooks/usePersonalOnboarding";
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
  ExternalLink,
  ChevronDown,
  Palette,
  Lock,
  Sparkles
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LinkModal } from "@/components/personal/LinkModal";
import { BlocksManager } from "@/components/personal/BlocksManager";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { HeaderCustomizer } from "@/components/personal/HeaderCustomizer";
import { getPlatformConfig } from "@/lib/platformLinks";
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
}

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
  reorderBlocks
}: Props) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFreePlan = formData.planType === "free";
  const maxFreeLinks = PERSONAL_PLANS.free.maxLinks;

  const checkProFeature = (featureName: string): boolean => {
    if (!isFreePlan) return true; // Pro users can use everything
    setUpgradeFeatureName(featureName);
    setUpgradeDialogOpen(true);
    return false;
  };

  const handleUpgradeToPro = () => {
    updateFormData({ planType: "yearly" });
    setUpgradeDialogOpen(false);
    toast.success("Upgraded to Pro! You now have a 7-day free trial.");
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingPhoto(true);
    
    try {
      // Compress large images before cropping
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        
        // Resize to max 1200px
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
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
        });
        processedFile = new File([blob], file.name, { type: "image/jpeg" });
        URL.revokeObjectURL(url);
      }
      
      // Store the file and open cropper
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

  const handleCropComplete = (croppedBlob: Blob, previewUrl: string) => {
    updateFormData({ 
      croppedPhotoBlob: croppedBlob,
      profilePhotoUrl: previewUrl 
    });
    toast.success("Photo added!");
  };

  const handleEditLink = (link: PersonalLink) => {
    setEditingLink(link);
    setLinkModalOpen(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLinks = [...formData.links];
    const [draggedLink] = newLinks.splice(draggedIndex, 1);
    newLinks.splice(index, 0, draggedLink);
    
    reorderLinks(newLinks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const existingTypes = formData.links.map(l => l.type);
  const canProceed = formData.profilePhotoUrl !== null;

  return (
    <div className="space-y-6">
      {/* Profile Photo Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Profile photo</Label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative h-24 w-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden group"
            disabled={uploadingPhoto}
          >
            {formData.profilePhotoUrl ? (
              <img 
                src={formData.profilePhotoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                {uploadingPhoto ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            )}
            {formData.profilePhotoUrl && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </button>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Upload a photo</p>
            <p>This will appear on your card and profile</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        {!formData.profilePhotoUrl && (
          <p className="text-sm text-destructive">Required</p>
        )}
      </div>

      {/* Links Section */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-foreground">Your links</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add your social media, website, or any link you want to share.
          </p>
        </div>
        
        {/* Existing Links */}
        {formData.links.length > 0 && (
          <div className="space-y-2">
            {formData.links.map((link, index) => {
              const config = getPlatformConfig(link.type);
              const Icon = config?.icon;
              
              return (
                <div
                  key={link.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ touchAction: "manipulation" }}
                  className={`flex items-center gap-3 p-3 min-h-[56px] bg-card rounded-xl border border-border cursor-move transition-all ${
                    draggedIndex === index ? "opacity-50 scale-95" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${config?.gradient || config?.bgColor || "bg-primary/10"}`}>
                    {Icon && <Icon className={`h-5 w-5 ${config?.color || "text-primary"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {link.value}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditLink(link)}
                    className="p-3 -m-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteId(link.id)}
                    className="p-3 -m-1 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Link Button */}
        <button 
          onClick={() => {
            if (isFreePlan && formData.links.length >= maxFreeLinks) {
              checkProFeature("unlimited links");
              return;
            }
            setEditingLink(null);
            setLinkModalOpen(true);
          }}
          className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Add a link</span>
          {isFreePlan && (
            <span className="ml-auto text-xs text-muted-foreground">
              {formData.links.length}/{maxFreeLinks}
            </span>
          )}
        </button>

        <p className="text-sm text-muted-foreground">
          These links appear when someone visits your profile.
        </p>
      </div>

      {/* Blocks Section */}
      <div className="space-y-2">
        <div>
          <Label className="text-sm font-medium text-foreground">Blocks</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add extra content like text, images, videos, or buttons to stand out.
          </p>
        </div>
        <BlocksManager
          blocks={formData.blocks}
          onAdd={addBlock}
          onUpdate={updateBlock}
          onRemove={removeBlock}
          onReorder={reorderBlocks}
        />
      </div>

      {/* Theme Customization */}
      <Collapsible open={themeOpen} onOpenChange={setThemeOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
            <div>
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Palette className="h-4 w-4" />
                Customize Theme
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                Change colors and style to match your brand.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${themeOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Card Headline */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Card Headline</Label>
            <Input
              value={formData.cardHeadline || ""}
              onChange={(e) => updateFormData({ cardHeadline: e.target.value })}
              placeholder="Enter a headline for your card"
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              This appears on your physical card.
            </p>
          </div>

          {/* Header & Background Colors */}
          <HeaderCustomizer
            headerType={formData.headerType || "color"}
            headerColor={formData.headerColor}
            headerImageUrl={formData.headerImageUrl}
            backgroundColor={formData.backgroundColor}
            onUpdate={(updates) => {
              // Gate custom header image behind Pro
              if (updates.headerType === "image" && isFreePlan) {
                checkProFeature("custom header images");
                return;
              }
              updateFormData(updates);
            }}
          />
        </CollapsibleContent>
      </Collapsible>

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
          disabled={!canProceed || isLoading}
          className="flex-1 h-14 text-base font-semibold"
        >
          Continue
        </Button>
      </div>

      {/* Link Modal */}
      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={addLink}
        editingLink={editingLink}
        onUpdate={updateLink}
        existingTypes={existingTypes}
      />

      {/* Image Cropper */}
      {rawImageUrl && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={rawImageUrl}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  removeLink(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
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
              Upgrade to Pro to unlock {upgradeFeatureName}. Try it free for 7 days — no charge today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Maybe later</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgradeToPro}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Try Pro Free for 7 Days
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
