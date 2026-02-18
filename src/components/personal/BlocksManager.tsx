import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PersonalBlock } from "@/hooks/usePersonalOnboarding";
import { 
  Plus, 
  Youtube, 
  Image as ImageIcon, 
  Type, 
  MousePointerClick,
  GripVertical,
  Trash2,
  Edit
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  blocks: PersonalBlock[];
  onAdd: (block: Omit<PersonalBlock, "id" | "sortOrder">) => void;
  onUpdate: (id: string, updates: Partial<PersonalBlock>) => void;
  onRemove: (id: string) => void;
  onReorder: (blocks: PersonalBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: "youtube", label: "YouTube Video", icon: Youtube, description: "Embed a video" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Upload an image" },
  { type: "text", label: "Text", icon: Type, description: "Title and body text" },
  { type: "button", label: "Featured Button", icon: MousePointerClick, description: "Big CTA button" },
] as const;

export const BlocksManager = ({ blocks, onAdd, onUpdate, onRemove, onReorder }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Form states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedType(null);
    setEditingBlock(null);
    setYoutubeUrl("");
    setImageFile(null);
    setImagePreview("");
    setTextTitle("");
    setTextBody("");
    setButtonLabel("");
    setButtonUrl("");
  };

  const handleOpenModal = (block?: PersonalBlock) => {
    if (block) {
      setEditingBlock(block);
      setSelectedType(block.type);
      if (block.type === "youtube") {
        setYoutubeUrl(block.content.url || "");
      } else if (block.type === "image") {
        setImagePreview(block.content.url || "");
      } else if (block.type === "text") {
        setTextTitle(block.content.title || "");
        setTextBody(block.content.body || "");
      } else if (block.type === "button") {
        setButtonLabel(block.content.label || "");
        setButtonUrl(block.content.url || "");
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

  const handleSave = () => {
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
        if (!imagePreview) {
          toast.error("Please select an image");
          return;
        }
        content = { url: imagePreview };
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
        content = { label: buttonLabel, url: buttonUrl };
        break;
      }
    }

    if (editingBlock) {
      onUpdate(editingBlock.id, { content });
    } else {
      onAdd({ type: selectedType as PersonalBlock["type"], content });
    }

    handleCloseModal();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    // Compress large images
    if (file.size > 2 * 1024 * 1024) {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
        });
        const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
        setImageFile(compressedFile);
        setImagePreview(URL.createObjectURL(blob));
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Failed to process image");
      }
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    onReorder(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const renderBlockPreview = (block: PersonalBlock) => {
    switch (block.type) {
      case "youtube":
        return (
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500" />
            <span className="text-sm truncate">{block.content.url}</span>
          </div>
        );
      case "image":
        return (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Image block</span>
          </div>
        );
      case "text":
        return (
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-gray-500" />
            <span className="text-sm truncate">{block.content.title}</span>
          </div>
        );
      case "button":
        return (
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary" />
            <span className="text-sm truncate">{block.content.label}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Blocks</Label>
      
      {/* Existing blocks */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border cursor-move transition-all ${
                draggedIndex === index ? "opacity-50 scale-95" : ""
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
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
                      className="w-full h-40 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload</span>
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
                <Button onClick={handleSave} className="flex-1">
                  {editingBlock ? "Save" : "Add"}
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
              onClick={() => {
                if (deleteId) {
                  onRemove(deleteId);
                  setDeleteId(null);
                }
              }}
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
