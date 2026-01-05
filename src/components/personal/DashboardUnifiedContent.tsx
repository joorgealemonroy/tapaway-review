import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  GripVertical, 
  Trash2, 
  Edit, 
  Star, 
  Eye, 
  EyeOff,
  Plus,
  Youtube,
  Image as ImageIcon,
  Type,
  MousePointerClick
} from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { LinkModal } from "@/components/personal/LinkModal";
import { BlockModal } from "@/components/personal/BlockModal";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";

interface DbPersonalLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  sort_order: number;
  pill_color: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
}

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
  is_active?: boolean | null;
}

interface PersonalLink {
  id: string;
  type: string;
  label: string;
  value: string;
  url: string;
  pillColor?: string | null;
}

type UnifiedItem = 
  | { kind: "link"; data: DbPersonalLink }
  | { kind: "block"; data: PersonalBlock };

interface Props {
  profileId: string;
  links: DbPersonalLink[];
  blocks: PersonalBlock[];
  onLinksChange: (links: DbPersonalLink[]) => void;
  onBlocksChange: (blocks: PersonalBlock[]) => void;
}

export const DashboardUnifiedContent = ({ 
  profileId, 
  links, 
  blocks, 
  onLinksChange, 
  onBlocksChange 
}: Props) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ kind: "link" | "block"; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ index: number; item: UnifiedItem } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Combine and sort all items by sort_order
  const unifiedItems: UnifiedItem[] = [
    ...links.map((link): UnifiedItem => ({ kind: "link", data: link })),
    ...blocks.map((block): UnifiedItem => ({ kind: "block", data: { ...block, is_active: (block as any).is_active ?? true } })),
  ].sort((a, b) => a.data.sort_order - b.data.sort_order);

  const convertToPersonalLink = (dbLink: DbPersonalLink): PersonalLink => ({
    id: dbLink.id,
    type: dbLink.link_type,
    label: dbLink.label,
    value: getPlatformConfig(dbLink.link_type)?.extractValue(dbLink.url) || dbLink.url,
    url: dbLink.url,
    pillColor: dbLink.pill_color,
  });

  // Persist the new unified order to both tables
  const persistOrder = async (items: UnifiedItem[]) => {
    try {
      const linkUpdates: { id: string; sort_order: number }[] = [];
      const blockUpdates: { id: string; sort_order: number }[] = [];

      items.forEach((item, index) => {
        if (item.kind === "link") {
          linkUpdates.push({ id: item.data.id, sort_order: index });
        } else {
          blockUpdates.push({ id: item.data.id, sort_order: index });
        }
      });

      // Update links
      for (const update of linkUpdates) {
        await supabase
          .from("personal_links")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      // Update blocks
      for (const update of blockUpdates) {
        await supabase
          .from("personal_blocks")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      // Update local state with new sort orders
      const updatedLinks = links.map(link => {
        const update = linkUpdates.find(u => u.id === link.id);
        return update ? { ...link, sort_order: update.sort_order } : link;
      });
      const updatedBlocks = blocks.map(block => {
        const update = blockUpdates.find(u => u.id === block.id);
        return update ? { ...block, sort_order: update.sort_order } : block;
      });

      onLinksChange(updatedLinks);
      onBlocksChange(updatedBlocks);
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to save order");
    }
  };

  // Drag handlers
  const handleDragStart = (index: number, item: UnifiedItem) => {
    setDraggedItem({ index, item });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.index === index) return;

    const newItems = [...unifiedItems];
    const [removed] = newItems.splice(draggedItem.index, 1);
    newItems.splice(index, 0, removed);

    // Update sort_order in memory
    newItems.forEach((item, i) => {
      item.data.sort_order = i;
    });

    // Separate back to links and blocks
    const newLinks = newItems
      .filter((item): item is { kind: "link"; data: DbPersonalLink } => item.kind === "link")
      .map(item => item.data);
    const newBlocks = newItems
      .filter((item): item is { kind: "block"; data: PersonalBlock } => item.kind === "block")
      .map(item => item.data);

    onLinksChange(newLinks);
    onBlocksChange(newBlocks);
    setDraggedItem({ index, item: draggedItem.item });
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;
    setDraggedItem(null);
    await persistOrder(unifiedItems);
  };

  // Touch handlers for mobile
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentIndex, setTouchCurrentIndex] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number, item: UnifiedItem) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentIndex(index);
    setDraggedItem({ index, item });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || touchCurrentIndex === null || !draggedItem) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    const itemHeight = 64;
    const indexDiff = Math.round(diff / itemHeight);
    const newIndex = Math.max(0, Math.min(unifiedItems.length - 1, touchCurrentIndex + indexDiff));

    if (newIndex !== draggedItem.index) {
      const newItems = [...unifiedItems];
      const [removed] = newItems.splice(draggedItem.index, 1);
      newItems.splice(newIndex, 0, removed);

      newItems.forEach((item, i) => {
        item.data.sort_order = i;
      });

      const newLinks = newItems
        .filter((item): item is { kind: "link"; data: DbPersonalLink } => item.kind === "link")
        .map(item => item.data);
      const newBlocks = newItems
        .filter((item): item is { kind: "block"; data: PersonalBlock } => item.kind === "block")
        .map(item => item.data);

      onLinksChange(newLinks);
      onBlocksChange(newBlocks);
      setDraggedItem({ index: newIndex, item: draggedItem.item });
    }
  };

  const handleTouchEnd = async () => {
    setTouchStartY(null);
    setTouchCurrentIndex(null);
    await handleDragEnd();
  };

  // Link handlers
  const handleAddLink = async (link: Omit<PersonalLink, "id">) => {
    setSaving(true);
    try {
      const maxOrder = Math.max(...unifiedItems.map(i => i.data.sort_order), -1);
      const newLink = {
        profile_id: profileId,
        link_type: link.type,
        label: link.label,
        url: link.url,
        sort_order: maxOrder + 1,
        pill_color: link.pillColor || null,
      };

      const { data, error } = await supabase
        .from("personal_links")
        .insert(newLink)
        .select()
        .single();

      if (error) throw error;

      onLinksChange([...links, data]);
      setLinkModalOpen(false);
      toast.success("Link added!");
    } catch (err) {
      console.error("Error adding link:", err);
      toast.error("Failed to add link");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<PersonalLink>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("personal_links")
        .update({
          link_type: updates.type,
          label: updates.label,
          url: updates.url,
          pill_color: updates.pillColor || null,
        })
        .eq("id", id);

      if (error) throw error;

      onLinksChange(links.map(l => 
        l.id === id 
          ? { 
              ...l, 
              link_type: updates.type || l.link_type, 
              label: updates.label || l.label, 
              url: updates.url || l.url,
              pill_color: updates.pillColor !== undefined ? updates.pillColor : l.pill_color,
            }
          : l
      ));
      setLinkModalOpen(false);
      setEditingLink(null);
      toast.success("Link updated!");
    } catch (err) {
      console.error("Error updating link:", err);
      toast.error("Failed to update link");
    } finally {
      setSaving(false);
    }
  };

  const toggleLinkVisibility = async (id: string, currentState: boolean | null) => {
    const newState = !(currentState ?? true);
    try {
      const { error } = await supabase
        .from("personal_links")
        .update({ is_active: newState })
        .eq("id", id);

      if (error) throw error;

      onLinksChange(links.map(l => 
        l.id === id ? { ...l, is_active: newState } : l
      ));
      toast.success(newState ? "Link visible" : "Link hidden");
    } catch (err) {
      console.error("Error toggling visibility:", err);
      toast.error("Failed to update link");
    }
  };

  const toggleFeatured = async (id: string, currentState: boolean | null) => {
    const newState = !(currentState ?? false);
    try {
      if (newState) {
        await supabase
          .from("personal_links")
          .update({ is_featured: false })
          .eq("profile_id", profileId)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("personal_links")
        .update({ is_featured: newState })
        .eq("id", id);

      if (error) throw error;

      onLinksChange(links.map(l => 
        l.id === id 
          ? { ...l, is_featured: newState }
          : newState ? { ...l, is_featured: false } : l
      ));
      toast.success(newState ? "Link featured!" : "Link unfeatured");
    } catch (err) {
      console.error("Error toggling featured:", err);
      toast.error("Failed to update link");
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.kind === "link") {
        const { error } = await supabase
          .from("personal_links")
          .delete()
          .eq("id", deleteItem.id);
        if (error) throw error;
        onLinksChange(links.filter(l => l.id !== deleteItem.id));
      } else {
        const { error } = await supabase
          .from("personal_blocks")
          .delete()
          .eq("id", deleteItem.id);
        if (error) throw error;
        onBlocksChange(blocks.filter(b => b.id !== deleteItem.id));
      }
      setDeleteItem(null);
      toast.success("Item removed");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete");
    }
  };

  const renderBlockIcon = (blockType: string) => {
    switch (blockType) {
      case "youtube":
        return <Youtube className="h-5 w-5 text-red-500" />;
      case "image":
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      case "text":
        return <Type className="h-5 w-5 text-muted-foreground" />;
      case "button":
        return <MousePointerClick className="h-5 w-5 text-primary" />;
      default:
        return null;
    }
  };

  const getBlockLabel = (block: PersonalBlock) => {
    const content = block.content as Record<string, string>;
    switch (block.block_type) {
      case "youtube":
        return "YouTube Video";
      case "image":
        return "Image block";
      case "text":
        return content.title || "Text block";
      case "button":
        return content.label || "Button";
      default:
        return "Block";
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Content</Label>
      
      {unifiedItems.length > 0 && (
        <div className="space-y-2">
          {unifiedItems.map((item, index) => {
            const isDragging = draggedItem?.index === index;
            
            if (item.kind === "link") {
              const link = item.data;
              const config = getPlatformConfig(link.link_type);
              const Icon = config?.icon;
              const isActive = link.is_active !== false;
              const isFeatured = link.is_featured === true;

              return (
                <div
                  key={`link-${link.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index, item)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-2 p-3 bg-card rounded-xl border transition-all touch-none ${
                    isDragging ? "opacity-50 scale-95 shadow-lg" : ""
                  } ${isFeatured ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-border"} ${!isActive ? "opacity-50" : ""}`}
                >
                  <div className="p-1 cursor-grab active:cursor-grabbing touch-none">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div 
                    className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${!link.pill_color ? (config?.gradient || config?.bgColor || "bg-primary/10") : ""}`}
                    style={link.pill_color ? { backgroundColor: link.pill_color } : undefined}
                  >
                    {Icon && <Icon className={`h-5 w-5 ${link.pill_color ? "text-white" : config?.color || "text-primary"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground">{link.label}</p>
                      {isFeatured && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                          FEATURED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  
                  <button
                    onClick={() => toggleFeatured(link.id, link.is_featured)}
                    className={`p-2 rounded-lg transition-colors ${isFeatured ? "text-amber-500 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <Star className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`} />
                  </button>
                  
                  <button
                    onClick={() => toggleLinkVisibility(link.id, link.is_active)}
                    className={`p-2 rounded-lg transition-colors ${isActive ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground/50 bg-muted"}`}
                  >
                    {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingLink(convertToPersonalLink(link));
                      setLinkModalOpen(true);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteItem({ kind: "link", id: link.id })}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            } else {
              const block = item.data;
              const isActive = block.is_active !== false;

              return (
                <div
                  key={`block-${block.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index, item)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border transition-all touch-none ${
                    isDragging ? "opacity-50 scale-95 shadow-lg" : ""
                  } ${!isActive ? "opacity-50" : ""}`}
                >
                  <div className="p-1 cursor-grab active:cursor-grabbing touch-none">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {renderBlockIcon(block.block_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{getBlockLabel(block)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{block.block_type} block</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBlock(block);
                      setBlockModalOpen(true);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteItem({ kind: "block", id: block.id })}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Add buttons */}
      <div className="flex gap-2">
        <button 
          onClick={() => {
            setEditingLink(null);
            setLinkModalOpen(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Add link</span>
        </button>
        <button 
          onClick={() => {
            setEditingBlock(null);
            setBlockModalOpen(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Add block</span>
        </button>
      </div>

      {unifiedItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Add your first link or content block
        </p>
      )}

      {/* Link Modal */}
      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={handleAddLink}
        editingLink={editingLink}
        onUpdate={handleUpdateLink}
        existingTypes={[]}
      />

      {/* Block Modal */}
      <BlockModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        profileId={profileId}
        editingBlock={editingBlock}
        currentMaxOrder={Math.max(...unifiedItems.map(i => i.data.sort_order), -1)}
        onBlockSaved={(block) => {
          if (editingBlock) {
            onBlocksChange(blocks.map(b => b.id === block.id ? block : b));
          } else {
            onBlocksChange([...blocks, block]);
          }
          setBlockModalOpen(false);
          setEditingBlock(null);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this {deleteItem?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
