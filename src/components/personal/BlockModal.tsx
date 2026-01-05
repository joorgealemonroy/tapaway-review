import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { 
  Youtube, 
  Image as ImageIcon, 
  Type, 
  MousePointerClick,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crop,
  Link as LinkIcon,
  Smartphone
} from "lucide-react";
import { toast } from "sonner";

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
  is_active?: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  username?: string;
  editingBlock: PersonalBlock | null;
  currentMaxOrder: number;
  onBlockSaved: (block: PersonalBlock) => void;
  deferSave?: boolean; // If true, don't save to DB, just return the block data
}

const BLOCK_TYPES = [
  { type: "youtube", label: "YouTube Video", icon: Youtube, description: "Embed a video" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Upload an image" },
  { type: "text", label: "Text", icon: Type, description: "Title and body text" },
  { type: "button", label: "Featured Button", icon: MousePointerClick, description: "Big CTA button" },
] as const;

export const BlockModal = ({ 
  open, 
  onOpenChange, 
  profileId, 
  username,
  editingBlock, 
  currentMaxOrder,
  onBlockSaved,
  deferSave = false,
}: Props) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [alignment, setAlignment] = useState("center");
  
  // New image block options
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [imageSize, setImageSize] = useState<"small" | "large">("large");
  
  // Text overlay options for image blocks
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlaySubtitle, setOverlaySubtitle] = useState("");
  const [overlayCta, setOverlayCta] = useState("");
  
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset/populate form when modal opens or editingBlock changes
  useEffect(() => {
    if (open) {
      if (editingBlock) {
        setSelectedType(editingBlock.block_type);
        setAlignment(editingBlock.alignment || "center");
        const content = editingBlock.content as Record<string, string>;
        if (editingBlock.block_type === "youtube") {
          setYoutubeUrl(content.url || "");
        } else if (editingBlock.block_type === "image") {
          setImageUrl(content.url || "");
          setImageLinkUrl(content.linkUrl || "");
          setImageSize((content.size as "small" | "large") || "large");
          setOverlayTitle(content.overlayTitle || "");
          setOverlaySubtitle(content.overlaySubtitle || "");
          setOverlayCta(content.overlayCta || "");
        } else if (editingBlock.block_type === "text") {
          setTextTitle(content.title || "");
          setTextBody(content.body || "");
        } else if (editingBlock.block_type === "button") {
          setButtonLabel(content.label || "");
          setButtonUrl(content.url || "");
        }
      } else {
        resetForm();
      }
    }
  }, [open, editingBlock]);

  const resetForm = () => {
    setSelectedType(null);
    setYoutubeUrl("");
    setImageUrl("");
    setTextTitle("");
    setTextBody("");
    setButtonLabel("");
    setButtonUrl("");
    setAlignment("center");
    setImageLinkUrl("");
    setImageSize("large");
    setRawImageForCrop(null);
    setOverlayTitle("");
    setOverlaySubtitle("");
    setOverlayCta("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1024;
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

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for cropper
    const objectUrl = URL.createObjectURL(file);
    setRawImageForCrop(objectUrl);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setUploadingImage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use webp extension for smaller files (cropper outputs webp when supported)
      const extension = croppedBlob.type === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${user.id}/blocks/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, croppedBlob, { contentType: croppedBlob.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (rawImageForCrop) {
        URL.revokeObjectURL(rawImageForCrop);
        setRawImageForCrop(null);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedType) return;

    let content: Record<string, string> = {};

    switch (selectedType) {
      case "youtube": {
        const videoId = extractYoutubeId(youtubeUrl);
        if (!videoId) {
          toast.error("Invalid YouTube URL");
          return;
        }
        content = { url: youtubeUrl, videoId };
        break;
      }
      case "image": {
        if (!imageUrl) {
          toast.error("Please select an image");
          return;
        }
        content = { 
          url: imageUrl,
          linkUrl: imageLinkUrl.trim() ? (imageLinkUrl.startsWith("http") ? imageLinkUrl : `https://${imageLinkUrl}`) : "",
          size: imageSize,
          overlayTitle: overlayTitle.trim(),
          overlaySubtitle: overlaySubtitle.trim(),
          overlayCta: overlayCta.trim(),
        };
        break;
      }
      case "text": {
        if (!textTitle.trim()) {
          toast.error("Please enter a title");
          return;
        }
        content = { title: textTitle, body: textBody };
        break;
      }
      case "button": {
        if (!buttonLabel.trim() || !buttonUrl.trim()) {
          toast.error("Please fill in all fields");
          return;
        }
        content = { label: buttonLabel, url: buttonUrl.startsWith("http") ? buttonUrl : `https://${buttonUrl}` };
        break;
      }
    }

    // If deferSave is true, just return the block data without saving to DB
    if (deferSave) {
      if (editingBlock) {
        onBlockSaved({ ...editingBlock, content, alignment });
      } else {
        // Create a new block with a temporary ID
        const newBlock: PersonalBlock = {
          id: crypto.randomUUID(),
          block_type: selectedType,
          content,
          alignment,
          sort_order: currentMaxOrder + 1,
          is_active: true,
        };
        onBlockSaved(newBlock);
      }
      handleClose();
      return;
    }

    setSaving(true);
    try {
      if (editingBlock) {
        const { error } = await supabase
          .from("personal_blocks")
          .update({ content, alignment })
          .eq("id", editingBlock.id);

        if (error) throw error;

        onBlockSaved({ ...editingBlock, content, alignment });
        toast.success(
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Saved! Check the preview to see your changes.</span>
          </div>,
          { duration: 3000 }
        );
      } else {
        const { data, error } = await supabase
          .from("personal_blocks")
          .insert({
            profile_id: profileId,
            block_type: selectedType,
            content,
            alignment,
            sort_order: currentMaxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;

        onBlockSaved(data);
        toast.success(
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Saved! Check the preview to see your changes.</span>
          </div>,
          { duration: 3000 }
        );
      }
      
      // Invalidate cache
      if (username) {
        invalidateProfileCache(username);
      }
      
      handleClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save block");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? "Edit block" : selectedType ? "Configure block" : "Add a block"}
            </DialogTitle>
          </DialogHeader>

          {!selectedType ? (
            <div className="space-y-2 pt-2">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setSelectedType(type.type)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-left"
                >
                  <type.icon className="h-5 w-5 text-foreground" />
                  <div>
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {selectedType === "youtube" && (
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              {selectedType === "image" && (
                <>
                  <div className="space-y-2">
                    <Label>Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {imageUrl ? (
                      <div className="relative">
                        <img 
                          src={imageUrl} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Crop className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to upload & crop</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Size toggle */}
                  <div className="space-y-2">
                    <Label>Display Size</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImageSize("small")}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          imageSize === "small" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        Small
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSize("large")}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          imageSize === "large" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        Large
                      </button>
                    </div>
                  </div>
                  
                  {/* Link URL (optional) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Link URL (optional)
                    </Label>
                    <Input
                      placeholder="https://example.com"
                      value={imageLinkUrl}
                      onChange={(e) => setImageLinkUrl(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Make image clickable</p>
                  </div>
                  
                  {/* Text Overlay (optional) */}
                  {imageUrl && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <Label className="text-sm font-medium">Text Overlay (optional)</Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="Title (e.g., Best Snacks To Sell 🤑)"
                          value={overlayTitle}
                          onChange={(e) => setOverlayTitle(e.target.value)}
                          className="h-10"
                        />
                        <Input
                          placeholder="Subtitle (e.g., Profits $$)"
                          value={overlaySubtitle}
                          onChange={(e) => setOverlaySubtitle(e.target.value)}
                          className="h-10"
                        />
                        <Input
                          placeholder="CTA text (e.g., Click Here)"
                          value={overlayCta}
                          onChange={(e) => setOverlayCta(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Text will appear on top of the image</p>
                    </div>
                  )}
                </>
              )}

              {selectedType === "text" && (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Section title"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body (optional)</Label>
                    <Textarea
                      placeholder="Add some details..."
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {selectedType === "button" && (
                <>
                  <div className="space-y-2">
                    <Label>Button Label</Label>
                    <Input
                      placeholder="Book Now"
                      value={buttonLabel}
                      onChange={(e) => setButtonLabel(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input
                      placeholder="https://..."
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </>
              )}

              {/* Alignment picker */}
              <div className="space-y-2">
                <Label>Alignment</Label>
                <RadioGroup 
                  value={alignment} 
                  onValueChange={setAlignment}
                  className="flex gap-2"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="left" id="align-left" className="sr-only" />
                    <Label
                      htmlFor="align-left"
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        alignment === "left" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="center" id="align-center" className="sr-only" />
                    <Label
                      htmlFor="align-center"
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        alignment === "center" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="right" id="align-right" className="sr-only" />
                    <Label
                      htmlFor="align-right"
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        alignment === "right" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-2 pt-2">
                {!editingBlock && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedType(null)}
                  >
                    Back
                  </Button>
                )}
                <Button 
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBlock ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      {rawImageForCrop && (
        <ImageCropper
          open={showCropper}
          onOpenChange={(open) => {
            setShowCropper(open);
            if (!open && rawImageForCrop) {
              URL.revokeObjectURL(rawImageForCrop);
              setRawImageForCrop(null);
            }
          }}
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={imageSize === "small" ? 1 : 16/9}
          cropShape="rect"
        />
      )}
    </>
  );
};
