import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BlockModal } from "@/components/personal/BlockModal";
import { toast } from "sonner";
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Pencil, 
  Trash2,
  Youtube,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Mail,
  Grid,
  Loader2
} from "lucide-react";
import { useTouchHoldDrag } from "@/hooks/useTouchHoldDrag";

export interface AdminBlock {
  id: string;
  block_type: string;
  content: Record<string, unknown>;
  alignment: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  blocks: AdminBlock[];
  onBlocksChange: (blocks: AdminBlock[]) => void;
  tempUserId?: string; // For uploading images before account creation
}

const BLOCK_TYPE_INFO: Record<string, { label: string; icon: React.ElementType }> = {
  youtube: { label: "YouTube Video", icon: Youtube },
  image: { label: "Image", icon: ImageIcon },
  text: { label: "Text", icon: Type },
  button: { label: "Featured Button", icon: MousePointerClick },
  email_capture: { label: "Email Capture", icon: Mail },
  photo_collage: { label: "Photo Collage", icon: Grid },
};

export const AdminBlocksManager = ({ blocks, onBlocksChange, tempUserId }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AdminBlock | null>(null);

  const currentMaxOrder = blocks.length > 0 
    ? Math.max(...blocks.map(b => b.sort_order)) 
    : 0;

  // Use the touch hold drag hook for better mobile UX
  const handleReorder = useCallback((newBlocks: AdminBlock[]) => {
    // Update sort orders
    newBlocks.forEach((block, i) => {
      block.sort_order = i;
    });
    onBlocksChange(newBlocks);
  }, [onBlocksChange]);

  const {
    draggedIndex,
    isDragEnabled,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useTouchHoldDrag({
    items: blocks,
    onReorder: handleReorder,
    itemHeight: 60,
  });

  const handleBlockSaved = (block: { id: string; block_type: string; content: unknown; alignment: string | null; sort_order: number; is_active?: boolean | null }) => {
    const existingIndex = blocks.findIndex(b => b.id === block.id);
    
    const normalizedBlock: AdminBlock = {
      id: block.id,
      block_type: block.block_type,
      content: block.content as Record<string, unknown>,
      alignment: block.alignment || "center",
      sort_order: block.sort_order,
      is_active: block.is_active ?? true,
    };

    if (existingIndex >= 0) {
      // Update existing
      const newBlocks = [...blocks];
      newBlocks[existingIndex] = normalizedBlock;
      onBlocksChange(newBlocks);
    } else {
      // Add new
      onBlocksChange([...blocks, normalizedBlock]);
    }
    setModalOpen(false);
    setEditingBlock(null);
  };

  const handleDeleteBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
  };

  const toggleActive = (id: string) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
  };

  const openEditModal = (block: AdminBlock) => {
    setEditingBlock(block);
    setModalOpen(true);
  };

  const getBlockPreview = (block: AdminBlock): string => {
    const content = block.content;
    switch (block.block_type) {
      case "youtube":
        return (content.url as string) || "YouTube video";
      case "image":
        return (content.overlayTitle as string) || "Image block";
      case "text":
        return (content.title as string) || "Text block";
      case "button":
        return (content.label as string) || "Button";
      case "email_capture":
        return (content.headline as string) || "Email capture";
      case "photo_collage": {
        try {
          const images = typeof content.images === 'string' 
            ? JSON.parse(content.images as string) 
            : content.images;
          return `${Array.isArray(images) ? images.length : 0} images`;
        } catch {
          return "Photo collage";
        }
      }
      default:
        return block.block_type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Content Blocks</p>
          <p className="text-xs text-muted-foreground">Add videos, images, text, buttons, and more</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setEditingBlock(null);
          setModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No content blocks added yet</p>
          <p className="text-xs">Click "Add Block" to add videos, images, text, etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const typeInfo = BLOCK_TYPE_INFO[block.block_type] || { label: block.block_type, icon: Type };
            const Icon = typeInfo.icon;
            
            return (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex items-center gap-2 p-3 bg-card border rounded-lg transition-all touch-none ${
                  draggedIndex === index ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                } ${isDragEnabled && draggedIndex === index ? "scale-105 shadow-xl" : ""} ${!block.is_active ? "opacity-50" : ""}`}
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground touch-none">
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{typeInfo.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getBlockPreview(block)}
                  </p>
                </div>

                <button
                  onClick={() => toggleActive(block.id)}
                  className={`p-1.5 rounded hover:bg-muted transition-colors ${
                    block.is_active ? "text-foreground" : "text-muted-foreground"
                  }`}
                  title={block.is_active ? "Hide" : "Show"}
                >
                  {block.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => openEditModal(block)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <BlockModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        profileId="" // Not used in deferSave mode
        editingBlock={editingBlock}
        currentMaxOrder={currentMaxOrder}
        onBlockSaved={handleBlockSaved}
        deferSave={true}
      />
    </div>
  );
};
