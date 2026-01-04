import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SignupData, PersonalLink } from "@/pages/personal/PersonalSignup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Instagram, 
  Youtube, 
  Globe, 
  Mail, 
  DollarSign, 
  Music, 
  Plus, 
  GripVertical,
  Trash2,
  Camera,
  Loader2,
  ArrowLeft
} from "lucide-react";

// TikTok icon since lucide doesn't have it
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const LINK_TYPES = [
  { type: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourname" },
  { type: "tiktok", label: "TikTok", icon: TikTokIcon, placeholder: "https://tiktok.com/@yourname" },
  { type: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourchannel" },
  { type: "website", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com" },
  { type: "email", label: "Email", icon: Mail, placeholder: "your@email.com" },
  { type: "payments", label: "Venmo / Cash App", icon: DollarSign, placeholder: "https://venmo.com/yourname" },
  { type: "music", label: "Spotify / Apple Music", icon: Music, placeholder: "https://open.spotify.com/artist/..." },
];

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const LinksStep = ({ formData, updateFormData, onNext, onBack, isLoading, setIsLoading }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<typeof LINK_TYPES[0] | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    
    try {
      // Create a preview URL immediately
      const previewUrl = URL.createObjectURL(file);
      updateFormData({ 
        profilePhoto: file, 
        profilePhotoUrl: previewUrl 
      });
      toast.success("Photo added!");
    } catch (err) {
      console.error("Error processing photo:", err);
      toast.error("Failed to process photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addLink = () => {
    if (!selectedType || !linkUrl.trim()) return;

    const newLink: PersonalLink = {
      id: crypto.randomUUID(),
      type: selectedType.type,
      label: selectedType.label,
      url: selectedType.type === "email" && !linkUrl.startsWith("mailto:") 
        ? `mailto:${linkUrl}` 
        : linkUrl,
    };

    updateFormData({ links: [...formData.links, newLink] });
    setDialogOpen(false);
    setSelectedType(null);
    setLinkUrl("");
  };

  const removeLink = (id: string) => {
    updateFormData({ links: formData.links.filter(l => l.id !== id) });
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
    
    updateFormData({ links: newLinks });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getLinkIcon = (type: string) => {
    const linkType = LINK_TYPES.find(l => l.type === type);
    if (!linkType) return Globe;
    return linkType.icon;
  };

  const availableTypes = LINK_TYPES.filter(
    type => !formData.links.some(link => link.type === type.type)
  );

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
          onChange={handlePhotoUpload}
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
              const Icon = getLinkIcon(link.type);
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
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <button
                    onClick={() => removeLink(link.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Link Button */}
        {availableTypes.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors">
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tap to add a link</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Add a link</DialogTitle>
              </DialogHeader>
              
              {!selectedType ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {availableTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.type}
                        onClick={() => setSelectedType(type)}
                        className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-left"
                      >
                        <Icon className="h-5 w-5 text-foreground" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <selectedType.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{selectedType.label}</span>
                  </div>
                  <Input
                    type={selectedType.type === "email" ? "email" : "url"}
                    placeholder={selectedType.placeholder}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedType(null);
                        setLinkUrl("");
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={addLink}
                      disabled={!linkUrl.trim()}
                      className="flex-1"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        <p className="text-sm text-muted-foreground">
          These links appear when someone taps your card or visits your profile.
        </p>
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
          disabled={!canProceed || isLoading}
          className="flex-1 h-14 text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
