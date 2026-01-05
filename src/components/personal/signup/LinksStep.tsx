import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink, PersonalBlock } from "@/hooks/usePersonalOnboarding";
import { toast } from "sonner";
import { 
  Plus, 
  GripVertical,
  Trash2,
  Camera,
  Loader2,
  ArrowLeft,
  Edit,
  ExternalLink
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LinkModal } from "@/components/personal/LinkModal";
import { BlocksManager } from "@/components/personal/BlocksManager";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { getPlatformConfig } from "@/lib/platformLinks";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Store the file and open cropper
    updateFormData({ profilePhoto: file });
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
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
        <Label className="text-sm font-medium text-foreground">Your links</Label>
        
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
                  className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border cursor-move transition-all ${
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
                    className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteId(link.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
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
            setEditingLink(null);
            setLinkModalOpen(true);
          }}
          className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Add a link</span>
        </button>

        <p className="text-sm text-muted-foreground">
          These links appear when someone taps your card or visits your profile.
        </p>
      </div>

      {/* Blocks Section */}
      <BlocksManager
        blocks={formData.blocks}
        onAdd={addBlock}
        onUpdate={updateBlock}
        onRemove={removeBlock}
        onReorder={reorderBlocks}
      />

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
    </div>
  );
};
