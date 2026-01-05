import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
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
  MousePointerClick,
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

// Track what's been changed
interface PendingChanges {
  addedLinks: DbPersonalLink[];
  updatedLinks: Map<string, Partial<DbPersonalLink>>;
  deletedLinkIds: Set<string>;
  addedBlocks: PersonalBlock[];
  updatedBlocks: Map<string, Partial<PersonalBlock>>;
  deletedBlockIds: Set<string>;
  orderChanged: boolean;
}

export interface DashboardUnifiedContentHandle {
  saveAllChanges: () => Promise<void>;
  discardChanges: () => void;
  hasPendingChanges: boolean;
}

interface Props {
  profileId: string;
  username: string;
  links: DbPersonalLink[];
  blocks: PersonalBlock[];
  onLinksChange: (links: DbPersonalLink[]) => void;
  onBlocksChange: (blocks: PersonalBlock[]) => void;
  onPendingChangesChange: (hasPending: boolean) => void;
}

const createEmptyPendingChanges = (): PendingChanges => ({
  addedLinks: [],
  updatedLinks: new Map(),
  deletedLinkIds: new Set(),
  addedBlocks: [],
  updatedBlocks: new Map(),
  deletedBlockIds: new Set(),
  orderChanged: false,
});

export const DashboardUnifiedContent = forwardRef<DashboardUnifiedContentHandle, Props>(({ 
  profileId, 
  username,
  links, 
  blocks, 
  onLinksChange, 
  onBlocksChange,
  onPendingChangesChange,
}, ref) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ kind: "link" | "block"; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ index: number; item: UnifiedItem } | null>(null);
  
  // Track pending changes - these haven't been saved to DB yet
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>(createEmptyPendingChanges());

  const hasPendingChanges = pendingChanges.addedLinks.length > 0 ||
    pendingChanges.updatedLinks.size > 0 ||
    pendingChanges.deletedLinkIds.size > 0 ||
    pendingChanges.addedBlocks.length > 0 ||
    pendingChanges.updatedBlocks.size > 0 ||
    pendingChanges.deletedBlockIds.size > 0 ||
    pendingChanges.orderChanged;

  // Notify parent when pending changes state changes
  const markPendingChange = useCallback((changes: Partial<PendingChanges>) => {
    setPendingChanges(prev => {
      const updated = { ...prev, ...changes };
      // Check if has pending after update
      const hasChanges = updated.addedLinks.length > 0 ||
        updated.updatedLinks.size > 0 ||
        updated.deletedLinkIds.size > 0 ||
        updated.addedBlocks.length > 0 ||
        updated.updatedBlocks.size > 0 ||
        updated.deletedBlockIds.size > 0 ||
        updated.orderChanged;
      
      // Use setTimeout to avoid state update during render
      setTimeout(() => onPendingChangesChange(hasChanges), 0);
      
      return updated;
    });
  }, [onPendingChangesChange]);

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

  // Save all pending changes to DB
  const saveAllChanges = async () => {
    setSaving(true);
    try {
      // Save deleted items first
      for (const id of pendingChanges.deletedLinkIds) {
        await supabase.from("personal_links").delete().eq("id", id);
      }
      for (const id of pendingChanges.deletedBlockIds) {
        await supabase.from("personal_blocks").delete().eq("id", id);
      }

      // Save added items
      for (const link of pendingChanges.addedLinks) {
        await supabase.from("personal_links").insert({
          id: link.id,
          profile_id: profileId,
          link_type: link.link_type,
          label: link.label,
          url: link.url,
          sort_order: link.sort_order,
          pill_color: link.pill_color,
          is_active: link.is_active,
          is_featured: link.is_featured,
        });
      }
      for (const block of pendingChanges.addedBlocks) {
        const { error } = await supabase.from("personal_blocks").insert({
          profile_id: profileId,
          block_type: block.block_type,
          content: block.content as any,
          sort_order: block.sort_order,
          alignment: block.alignment,
          is_active: block.is_active,
        });
        if (error) console.error("Block insert error:", error);
      }

      // Save updated items
      for (const [id, updates] of pendingChanges.updatedLinks) {
        await supabase.from("personal_links").update(updates).eq("id", id);
      }
      for (const [id, updates] of pendingChanges.updatedBlocks) {
        await supabase.from("personal_blocks").update(updates as any).eq("id", id);
      }

      // Save order changes if any
      if (pendingChanges.orderChanged) {
        for (const link of links) {
          await supabase
            .from("personal_links")
            .update({ sort_order: link.sort_order })
            .eq("id", link.id);
        }
        for (const block of blocks) {
          await supabase
            .from("personal_blocks")
            .update({ sort_order: block.sort_order })
            .eq("id", block.id);
        }
      }

      // Invalidate cache
      invalidateProfileCache(username);
      
      // Clear pending changes
      setPendingChanges(createEmptyPendingChanges());
      onPendingChangesChange(false);
      
      toast.success("Changes saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Discard all pending changes - reload from DB
  const discardChanges = useCallback(() => {
    // Remove locally added items from state
    const cleanedLinks = links.filter(l => !pendingChanges.addedLinks.find(al => al.id === l.id));
    const cleanedBlocks = blocks.filter(b => !pendingChanges.addedBlocks.find(ab => ab.id === b.id));
    
    // Restore deleted items - we need to reload from DB, so just trigger a refresh
    // For now, we'll clear pending and the parent should refetch
    setPendingChanges(createEmptyPendingChanges());
    onPendingChangesChange(false);
    
    // Signal parent to reload data
    toast.info("Changes discarded");
    // Trigger page reload to reset state
    window.location.reload();
  }, [links, blocks, pendingChanges, onPendingChangesChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    saveAllChanges,
    discardChanges,
    hasPendingChanges,
  }), [hasPendingChanges]);

  // Drag handlers (update local state, mark order as changed)
  const handleDragStart = (index: number, item: UnifiedItem) => {
    setDraggedItem({ index, item });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.index === index) return;

    const newItems = [...unifiedItems];
    const [removed] = newItems.splice(draggedItem.index, 1);
    newItems.splice(index, 0, removed);

    const updatedItems = newItems.map((item, i) => ({
      ...item,
      data: { ...item.data, sort_order: i }
    }));

    const newLinks = updatedItems
      .filter((item): item is { kind: "link"; data: DbPersonalLink } => item.kind === "link")
      .map(item => item.data);
    const newBlocks = updatedItems
      .filter((item): item is { kind: "block"; data: PersonalBlock } => item.kind === "block")
      .map(item => item.data);

    onLinksChange(newLinks);
    onBlocksChange(newBlocks);
    setDraggedItem({ index, item: draggedItem.item });
  };

  const handleDragEnd = () => {
    if (!draggedItem) return;
    setDraggedItem(null);
    markPendingChange({ orderChanged: true });
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

      const updatedItems = newItems.map((item, i) => ({
        ...item,
        data: { ...item.data, sort_order: i }
      }));

      const newLinks = updatedItems
        .filter((item): item is { kind: "link"; data: DbPersonalLink } => item.kind === "link")
        .map(item => item.data);
      const newBlocks = updatedItems
        .filter((item): item is { kind: "block"; data: PersonalBlock } => item.kind === "block")
        .map(item => item.data);

      onLinksChange(newLinks);
      onBlocksChange(newBlocks);
      setDraggedItem({ index: newIndex, item: draggedItem.item });
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
    setTouchCurrentIndex(null);
    if (draggedItem) {
      setDraggedItem(null);
      markPendingChange({ orderChanged: true });
    }
  };

  // Link handlers - now update local state only
  const handleAddLink = (link: Omit<PersonalLink, "id">) => {
    const maxOrder = Math.max(...unifiedItems.map(i => i.data.sort_order), -1);
    const newLink: DbPersonalLink = {
      id: crypto.randomUUID(),
      link_type: link.type,
      label: link.label,
      url: link.url,
      sort_order: maxOrder + 1,
      pill_color: link.pillColor || null,
      is_active: true,
      is_featured: false,
    };

    onLinksChange([...links, newLink]);
    markPendingChange({ addedLinks: [...pendingChanges.addedLinks, newLink] });
    setLinkModalOpen(false);
  };

  const handleUpdateLink = (id: string, updates: Partial<PersonalLink>) => {
    // Check if this is a pending add (not yet in DB)
    const isPendingAdd = pendingChanges.addedLinks.find(l => l.id === id);
    
    const dbUpdates: Partial<DbPersonalLink> = {
      link_type: updates.type,
      label: updates.label,
      url: updates.url,
      pill_color: updates.pillColor || null,
    };

    onLinksChange(links.map(l => 
      l.id === id 
        ? { ...l, ...dbUpdates }
        : l
    ));

    if (isPendingAdd) {
      // Update the pending add
      markPendingChange({
        addedLinks: pendingChanges.addedLinks.map(l => 
          l.id === id ? { ...l, ...dbUpdates } : l
        ),
      });
    } else {
      // Track as update
      const existingUpdates = pendingChanges.updatedLinks.get(id) || {};
      const newUpdates = new Map(pendingChanges.updatedLinks);
      newUpdates.set(id, { ...existingUpdates, ...dbUpdates });
      markPendingChange({ updatedLinks: newUpdates });
    }

    setLinkModalOpen(false);
    setEditingLink(null);
  };

  const toggleLinkVisibility = (id: string, currentState: boolean | null) => {
    const newState = !(currentState ?? true);
    
    onLinksChange(links.map(l => 
      l.id === id ? { ...l, is_active: newState } : l
    ));

    const isPendingAdd = pendingChanges.addedLinks.find(l => l.id === id);
    if (isPendingAdd) {
      markPendingChange({
        addedLinks: pendingChanges.addedLinks.map(l => 
          l.id === id ? { ...l, is_active: newState } : l
        ),
      });
    } else {
      const existingUpdates = pendingChanges.updatedLinks.get(id) || {};
      const newUpdates = new Map(pendingChanges.updatedLinks);
      newUpdates.set(id, { ...existingUpdates, is_active: newState });
      markPendingChange({ updatedLinks: newUpdates });
    }
  };

  const toggleFeatured = (id: string, currentState: boolean | null) => {
    const newState = !(currentState ?? false);
    
    // Unfeatured all others if setting to featured
    const updatedLinks = links.map(l => 
      l.id === id 
        ? { ...l, is_featured: newState }
        : newState ? { ...l, is_featured: false } : l
    );
    onLinksChange(updatedLinks);

    // Track all the changes
    const newUpdates = new Map(pendingChanges.updatedLinks);
    for (const link of updatedLinks) {
      if (link.id === id || newState) {
        const isPendingAdd = pendingChanges.addedLinks.find(l => l.id === link.id);
        if (!isPendingAdd) {
          const existingUpdates = newUpdates.get(link.id) || {};
          newUpdates.set(link.id, { ...existingUpdates, is_featured: link.is_featured });
        }
      }
    }
    
    // Update pending adds too
    if (newState) {
      markPendingChange({
        updatedLinks: newUpdates,
        addedLinks: pendingChanges.addedLinks.map(l => ({
          ...l,
          is_featured: l.id === id ? newState : false
        })),
      });
    } else {
      markPendingChange({ updatedLinks: newUpdates });
    }
  };

  // Delete handler - now marks for deletion, doesn't delete immediately
  const handleDelete = () => {
    if (!deleteItem) return;

    if (deleteItem.kind === "link") {
      const isPendingAdd = pendingChanges.addedLinks.find(l => l.id === deleteItem.id);
      
      if (isPendingAdd) {
        // Just remove from pending adds
        markPendingChange({
          addedLinks: pendingChanges.addedLinks.filter(l => l.id !== deleteItem.id),
        });
      } else {
        // Mark for deletion
        const newDeletedIds = new Set(pendingChanges.deletedLinkIds);
        newDeletedIds.add(deleteItem.id);
        markPendingChange({ deletedLinkIds: newDeletedIds });
      }
      
      onLinksChange(links.filter(l => l.id !== deleteItem.id));
    } else {
      const isPendingAdd = pendingChanges.addedBlocks.find(b => b.id === deleteItem.id);
      
      if (isPendingAdd) {
        markPendingChange({
          addedBlocks: pendingChanges.addedBlocks.filter(b => b.id !== deleteItem.id),
        });
      } else {
        const newDeletedIds = new Set(pendingChanges.deletedBlockIds);
        newDeletedIds.add(deleteItem.id);
        markPendingChange({ deletedBlockIds: newDeletedIds });
      }
      
      onBlocksChange(blocks.filter(b => b.id !== deleteItem.id));
    }
    
    setDeleteItem(null);
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

  // Handle block saved from modal - now tracks as pending
  const handleBlockSaved = (block: PersonalBlock) => {
    if (editingBlock) {
      // Update existing
      onBlocksChange(blocks.map(b => b.id === block.id ? block : b));
      
      const isPendingAdd = pendingChanges.addedBlocks.find(b => b.id === block.id);
      if (isPendingAdd) {
        markPendingChange({
          addedBlocks: pendingChanges.addedBlocks.map(b => 
            b.id === block.id ? block : b
          ),
        });
      } else {
        const newUpdates = new Map(pendingChanges.updatedBlocks);
        newUpdates.set(block.id, { content: block.content, alignment: block.alignment });
        markPendingChange({ updatedBlocks: newUpdates });
      }
    } else {
      // Add new - block already has DB-assigned id from BlockModal
      onBlocksChange([...blocks, block]);
      markPendingChange({
        addedBlocks: [...pendingChanges.addedBlocks, block],
      });
    }
    
    setBlockModalOpen(false);
    setEditingBlock(null);
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

      {/* Block Modal - now doesn't save to DB directly */}
      <BlockModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        profileId={profileId}
        username={username}
        editingBlock={editingBlock}
        currentMaxOrder={Math.max(...unifiedItems.map(i => i.data.sort_order), -1)}
        onBlockSaved={handleBlockSaved}
        deferSave={false}
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
});

DashboardUnifiedContent.displayName = "DashboardUnifiedContent";
