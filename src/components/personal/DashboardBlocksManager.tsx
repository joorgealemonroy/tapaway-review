import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Youtube, 
  Image as ImageIcon, 
  Type, 
  MousePointerClick,
  GripVertical,
  Trash2,
  Edit,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
}

interface Props {
  profileId: string;
  blocks: PersonalBlock[];
  onBlocksChange: (blocks: PersonalBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: "youtube", label: "YouTube Video", icon: Youtube, description: "Embed a video" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Upload an image" },
  { type: "text", label: "Text", icon: Type, description: "Title and body text" },
  { type: "button", label: "Featured Button", icon: MousePointerClick, description: "Big CTA button" },
] as const;

export const DashboardBlocksManager = ({ profileId, blocks, onBlocksChange }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentIndex, setTouchCurrentIndex] = useState<number | null>(null);
  
  // Form states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [alignment, setAlignment] = useState("center");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedType(null);
    setEditingBlock(null);
    setYoutubeUrl("");
    setImageUrl("");
    setTextTitle("");
    setTextBody("");
    setButtonLabel("");
    setButtonUrl("");
    setAlignment("center");
  };

  const handleOpenModal = (block?: PersonalBlock) => {
    if (block) {
      setEditingBlock(block);
      setSelectedType(block.block_type);
      setAlignment(block.alignment || "center");
      const content = block.content as Record<string, string>;
      if (block.block_type === "youtube") {
        setYoutubeUrl(content.url || "");
      } else if (block.block_type === "image") {
        setImageUrl(content.url || "");
      } else if (block.block_type === "text") {
        setTextTitle(content.title || "");
        setTextBody(content.body || "");
      } else if (block.block_type === "button") {
        setButtonLabel(content.label || "");
        setButtonUrl(content.url || "");
      }
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setModalOpen(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side compression for large files
    let processedFile: File | Blob = file;
    if (file.size > 5 * 1024 * 1024) {
      // Compress large images
      setUploadingImage(true);
      try {
        processedFile = await compressImage(file);
      } catch {
        toast.error("Failed to process image");
        setUploadingImage(false);
        return;
      }
    }

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/blocks/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, processedFile, { contentType: processedFile instanceof Blob ? 'image/jpeg' : file.type });
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
    }
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
        content = { url: imageUrl };
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

    setSaving(true);
    try {
      if (editingBlock) {
        // Update existing block
        const { error } = await supabase
          .from("personal_blocks")
          .update({ content, alignment })
          .eq("id", editingBlock.id);

        if (error) throw error;

        onBlocksChange(blocks.map(b => 
          b.id === editingBlock.id ? { ...b, content, alignment } : b
        ));
        toast.success("Block updated!");
      } else {
        // Create new block
        const { data, error } = await supabase
          .from("personal_blocks")
          .insert({
            profile_id: profileId,
            block_type: selectedType,
            content,
            alignment,
            sort_order: blocks.length,
          })
          .select()
          .single();

        if (error) throw error;

        onBlocksChange([...blocks, data]);
        toast.success("Block added!");
      }
      handleCloseModal();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save block");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_blocks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      onBlocksChange(blocks.filter(b => b.id !== id));
      setDeleteId(null);
      toast.success("Block removed");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete block");
    }
  };

  // Desktop drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    onBlocksChange(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    // Persist new order
    try {
      const updates = blocks.map((block, i) => ({
        id: block.id,
        sort_order: i,
      }));

      for (const update of updates) {
        await supabase
          .from("personal_blocks")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to save order");
    }
  };

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentIndex(index);
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || touchCurrentIndex === null) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    const itemHeight = 60; // Approximate height of each item
    const indexDiff = Math.round(diff / itemHeight);
    const newIndex = Math.max(0, Math.min(blocks.length - 1, touchCurrentIndex + indexDiff));

    if (newIndex !== draggedIndex && draggedIndex !== null) {
      const newBlocks = [...blocks];
      const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(newIndex, 0, draggedBlock);
      onBlocksChange(newBlocks);
      setDraggedIndex(newIndex);
    }
  };

  const handleTouchEnd = async () => {
    setTouchStartY(null);
    setTouchCurrentIndex(null);
    await handleDragEnd();
  };

  const renderBlockPreview = (block: PersonalBlock) => {
    const content = block.content as Record<string, string>;
    switch (block.block_type) {
      case "youtube":
        return (
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm truncate">{content.url}</span>
          </div>
        );
      case "image":
        return (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm">Image block</span>
          </div>
        );
      case "text":
        return (
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{content.title}</span>
          </div>
        );
      case "button":
        return (
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm truncate">{content.label}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Content Blocks</Label>
      
      {/* Existing blocks with drag handles */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border transition-all touch-none ${
                draggedIndex === index ? "opacity-50 scale-95 shadow-lg" : ""
              }`}
            >
              <div className="p-1 cursor-grab active:cursor-grabbing touch-none">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {renderBlockPreview(block)}
              </div>
              <button
                onClick={() => handleOpenModal(block)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setDeleteId(block.id)}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add block button */}
      <button
        onClick={() => handleOpenModal()}
        className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
      >
        <Plus className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Add a block</span>
      </button>

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                <div className="space-y-2">
                  <Label>Image</Label>
                  {imageUrl ? (
                    <div className="relative">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                      >
                        <span className="text-white text-sm">Change image</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full h-40 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload (up to 15MB)</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
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
                      placeholder="Add some description..."
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alignment</Label>
                    <div className="flex gap-2">
                      {[
                        { value: "left", icon: AlignLeft },
                        { value: "center", icon: AlignCenter },
                        { value: "right", icon: AlignRight },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAlignment(opt.value)}
                          className={`p-2 rounded-lg border ${
                            alignment === opt.value ? "border-primary bg-primary/10" : "border-border"
                          }`}
                        >
                          <opt.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedType === "button" && (
                <>
                  <div className="space-y-2">
                    <Label>Button label</Label>
                    <Input
                      placeholder="Shop Now"
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
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <div className="flex gap-2">
                      {[
                        { value: "left", icon: AlignLeft, label: "Left" },
                        { value: "center", icon: AlignCenter, label: "Center" },
                        { value: "right", icon: AlignRight, label: "Right" },
                        { value: "full", icon: Maximize2, label: "Full" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAlignment(opt.value)}
                          className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-1 ${
                            alignment === opt.value ? "border-primary bg-primary/10" : "border-border"
                          }`}
                        >
                          <opt.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (editingBlock) {
                      handleCloseModal();
                    } else {
                      setSelectedType(null);
                    }
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBlock ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this block?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardBlocksManager;
