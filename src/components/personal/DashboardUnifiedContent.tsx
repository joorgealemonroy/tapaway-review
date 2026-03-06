import { useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
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
  ShoppingBag,
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
  display_style?: string | null;
  cover_image_url?: string | null;
  grid_size?: string | null;
  thumbnail_url?: string | null;
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
  displayStyle?: string | null;
  gridSize?: string | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
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
  onDiscardRequest?: () => void;
  planType?: string | null;
  onUpgrade?: () => void;
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
  onDiscardRequest,
  planType,
  onUpgrade,
}, ref) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [editingBlock, setEditingBlock] = useState<PersonalBlock | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ kind: "link" | "block"; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ index: number; item: UnifiedItem } | null>(null);
  
  // Touch hold state for mobile UX
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const touchHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialTouchYRef = useRef<number | null>(null);
  const draggedElRef = useRef<HTMLElement | null>(null);
  
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

  // Group consecutive grid links for 2-column rendering
  type GroupedItem = 
    | { kind: "grid-group"; links: DbPersonalLink[] }
    | UnifiedItem;
  
  const groupedItems: GroupedItem[] = [];
  let currentGridGroup: DbPersonalLink[] = [];
  
  for (const item of unifiedItems) {
    if (item.kind === "link" && item.data.cover_image_url && item.data.grid_size === "half" && !item.data.is_featured) {
      currentGridGroup.push(item.data);
    } else {
      if (currentGridGroup.length > 0) {
        groupedItems.push({ kind: "grid-group", links: currentGridGroup });
        currentGridGroup = [];
      }
      groupedItems.push(item);
    }
  }
  if (currentGridGroup.length > 0) {
    groupedItems.push({ kind: "grid-group", links: currentGridGroup });
  }

  const convertToPersonalLink = (dbLink: DbPersonalLink): PersonalLink => ({
    id: dbLink.id,
    type: dbLink.link_type,
    label: dbLink.label,
    value: getPlatformConfig(dbLink.link_type)?.extractValue(dbLink.url) || dbLink.url,
    url: dbLink.url,
    pillColor: dbLink.pill_color,
    displayStyle: dbLink.display_style,
    gridSize: dbLink.grid_size,
    coverImageUrl: dbLink.cover_image_url,
    thumbnailUrl: dbLink.thumbnail_url,
  });

  // Core save logic — returns array of error strings (empty = success)
  const executeSave = async (): Promise<string[]> => {
    const errors: string[] = [];

    // Save deleted items first
    for (const id of pendingChanges.deletedLinkIds) {
      const { error } = await supabase.from("personal_links").delete().eq("id", id);
      if (error) errors.push(`Delete link: ${error.message}`);
    }
    for (const id of pendingChanges.deletedBlockIds) {
      const { error } = await supabase.from("personal_blocks").delete().eq("id", id);
      if (error) errors.push(`Delete block: ${error.message}`);
    }

    // Abort early if deletes failed — stale data would cause conflicts
    if (errors.length > 0) return errors;

    // Save added items
    for (const link of pendingChanges.addedLinks) {
      const { error } = await supabase.from("personal_links").insert({
        id: link.id,
        profile_id: profileId,
        link_type: link.link_type,
        label: link.label,
        url: link.url,
        sort_order: link.sort_order,
        pill_color: link.pill_color,
        is_active: link.is_active,
        is_featured: link.is_featured,
        display_style: link.display_style || 'pill',
        cover_image_url: link.cover_image_url || null,
        grid_size: link.grid_size || null,
        thumbnail_url: link.thumbnail_url || null,
      });
      if (error) errors.push(`Add link "${link.label}": ${error.message}`);
    }
    for (const block of pendingChanges.addedBlocks) {
      const { error } = await supabase.from("personal_blocks").insert({
        profile_id: profileId,
        block_type: block.block_type,
        content: block.content as import("@/integrations/supabase/types").Json,
        sort_order: block.sort_order,
        alignment: block.alignment,
        is_active: block.is_active,
      });
      if (error) errors.push(`Add block: ${error.message}`);
    }

    // Save updated items
    for (const [id, updates] of pendingChanges.updatedLinks) {
      const { error } = await supabase.from("personal_links").update(updates).eq("id", id);
      if (error) errors.push(`Update link: ${error.message}`);
    }
    for (const [id, updates] of pendingChanges.updatedBlocks) {
      const { error } = await supabase.from("personal_blocks").update(updates as Record<string, unknown>).eq("id", id);
      if (error) errors.push(`Update block: ${error.message}`);
    }

    // Save order changes if any
    if (pendingChanges.orderChanged) {
      for (const link of links) {
        const { error } = await supabase
          .from("personal_links")
          .update({ sort_order: link.sort_order })
          .eq("id", link.id);
        if (error) errors.push(`Reorder link: ${error.message}`);
      }
      for (const block of blocks) {
        const { error } = await supabase
          .from("personal_blocks")
          .update({ sort_order: block.sort_order })
          .eq("id", block.id);
        if (error) errors.push(`Reorder block: ${error.message}`);
      }
    }

    return errors;
  };

  // Save all pending changes to DB with auto-retry on failure
  const saveAllChanges = async () => {
    setSaving(true);

    try {
      let errors = await executeSave();

      // Auto-retry once after 2 seconds if there were errors
      if (errors.length > 0) {
        console.warn("Save attempt 1 failed, retrying in 2s:", errors);
        toast.loading("Retrying save…", { id: "save-retry" });
        await new Promise(resolve => setTimeout(resolve, 2000));
        errors = await executeSave();
        toast.dismiss("save-retry");
      }

      if (errors.length > 0) {
        console.error("Save errors after retry:", errors);
        toast.error("Some changes failed to save", {
          description: errors.join("; "),
        });
        return; // Keep pendingChanges so Save bar stays visible
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

  // Discard all pending changes - request parent to reload from DB
  const discardChanges = useCallback(() => {
    // Clear pending changes state
    setPendingChanges(createEmptyPendingChanges());
    onPendingChangesChange(false);
    
    // Signal parent to reload data from DB
    toast.info("Changes discarded");
    onDiscardRequest?.();
  }, [onPendingChangesChange, onDiscardRequest]);

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

  // Touch handlers for mobile - with hold delay for better UX
  const HOLD_DELAY_MS = 200;
  const initialTouchXRef = useRef<number | null>(null);

  const clearTouchTimer = useCallback(() => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent, index: number, item: UnifiedItem) => {
    e.preventDefault(); // Block iOS long-press text selection/callout
    // Store initial touch position
    initialTouchYRef.current = e.touches[0].clientY;
    initialTouchXRef.current = e.touches[0].clientX;
    // Track the dragged DOM element for elementFromPoint hit-testing
    draggedElRef.current = e.currentTarget as HTMLElement;
    
    // Start hold timer - only enable drag after delay
    touchHoldTimerRef.current = setTimeout(() => {
      setIsDragEnabled(true);
      setDraggedItem({ index, item });
      document.documentElement.classList.add("dragging-active");
      
      // Haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, HOLD_DELAY_MS);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If drag not enabled yet, check if user is scrolling
    if (!isDragEnabled) {
      if (initialTouchYRef.current !== null && initialTouchXRef.current !== null) {
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = Math.abs(currentY - initialTouchYRef.current);
        const diffX = Math.abs(currentX - initialTouchXRef.current);
        
        // If user moved more than 10px in any direction, they're scrolling - cancel the hold timer
        if (diffY > 10 || diffX > 10) {
          clearTouchTimer();
          initialTouchYRef.current = null;
          initialTouchXRef.current = null;
        }
      }
      return; // Let the page scroll normally
    }

    // Prevent scrolling when dragging
    e.preventDefault();

    if (!draggedItem) return;

    const touch = e.touches[0];
    
    // Temporarily hide the dragged element so elementFromPoint sees what's underneath
    const draggedEl = draggedElRef.current;
    if (draggedEl) draggedEl.style.pointerEvents = 'none';
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (draggedEl) draggedEl.style.pointerEvents = '';

    if (!target) return;

    // Walk up DOM to find the closest draggable item with data-drag-index
    const dropTarget = target.closest('[data-drag-index]');
    if (!dropTarget) return;

    const newIndex = Number(dropTarget.getAttribute('data-drag-index'));
    if (isNaN(newIndex) || newIndex === draggedItem.index) return;

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
  };

  const handleTouchEnd = () => {
    clearTouchTimer();
    document.documentElement.classList.remove("dragging-active");
    initialTouchYRef.current = null;
    initialTouchXRef.current = null;
    draggedElRef.current = null;
    
    if (isDragEnabled && draggedItem) {
      setDraggedItem(null);
      markPendingChange({ orderChanged: true });
    }
    
    setIsDragEnabled(false);
  };

  // Link handlers - now update local state only
  const handleAddLink = (link: Omit<PersonalLink, "id"> & { displayStyle?: string; coverImageUrl?: string | null; gridSize?: string | null }) => {
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
      display_style: link.displayStyle || 'pill',
      cover_image_url: link.coverImageUrl || null,
      grid_size: link.gridSize || null,
      thumbnail_url: link.thumbnailUrl || null,
    };

    onLinksChange([...links, newLink]);
    markPendingChange({ addedLinks: [...pendingChanges.addedLinks, newLink] });
    setLinkModalOpen(false);
  };

  const handleUpdateLink = (id: string, updates: Partial<PersonalLink & { displayStyle?: string; coverImageUrl?: string | null; gridSize?: string | null; thumbnailUrl?: string | null }>) => {
    // Check if this is a pending add (not yet in DB)
    const isPendingAdd = pendingChanges.addedLinks.find(l => l.id === id);
    
    const dbUpdates: Partial<DbPersonalLink> = {
      link_type: updates.type,
      label: updates.label,
      url: updates.url,
      pill_color: updates.pillColor || null,
      display_style: updates.displayStyle,
      cover_image_url: updates.coverImageUrl,
      grid_size: updates.gridSize,
      thumbnail_url: updates.thumbnailUrl,
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
      case "product":
        return <ShoppingBag className="h-5 w-5 text-emerald-500" />;
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
      case "product":
        return "Product block";
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
      
      {groupedItems.length > 0 && (
        <div className="space-y-2" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {groupedItems.map((groupedItem, groupIdx) => {
            // Grid group - render as 2-column grid
            if (groupedItem.kind === "grid-group") {
              return (
                <div key={`grid-group-${groupIdx}`} className="grid grid-cols-2 gap-2">
                  {groupedItem.links.map((link) => {
                    const index = unifiedItems.findIndex(
                      (i) => i.kind === "link" && i.data.id === link.id
                    );
                    const config = getPlatformConfig(link.link_type);
                    const Icon = config?.icon;
                    const isActive = link.is_active !== false;
                    const isDragging = draggedItem?.index === index;
                    
                    return (
                      <div
                        key={`link-${link.id}`}
                        data-drag-index={index}
                        draggable
                        onDragStart={() => handleDragStart(index, { kind: "link", data: link })}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, index, { kind: "link", data: link })}
                        
                        className={`relative aspect-square rounded-xl overflow-hidden border bg-card transition-all touch-none group ${
                          isDragging ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                        } ${isDragEnabled && isDragging ? "scale-105 shadow-xl" : ""} ${!isActive ? "opacity-50" : ""}`}
                      >
                        {/* Cover image */}
                        {link.cover_image_url && (
                          <img
                            src={link.cover_image_url}
                            alt={link.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Platform icon badge */}
                        {Icon && (
                          <div
                            className={`absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center ${config?.gradient || config?.bgColor || "bg-primary"}`}
                          >
                            <Icon className={`h-3 w-3 ${config?.color || "text-white"}`} />
                          </div>
                        )}

                        {/* Drag handle */}
                        <div className="absolute top-2 right-2 cursor-grab text-white/70 hover:text-white">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Label */}
                        <div className="absolute bottom-2 left-2 right-2 select-none pointer-events-none">
                          <span className="text-white font-bold text-xs drop-shadow-lg uppercase tracking-wide line-clamp-2 select-none">
                            {link.label}
                          </span>
                        </div>

                        {/* Actions overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleFeatured(link.id, link.is_featured)}
                            className={`p-1.5 rounded bg-white/20 hover:bg-white/30 transition-colors ${
                              link.is_featured ? "text-yellow-400" : "text-white"
                            }`}
                            title={link.is_featured ? "Unstar" : "Star"}
                          >
                            <Star className={`h-3.5 w-3.5 ${link.is_featured ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={() => toggleLinkVisibility(link.id, link.is_active)}
                            className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                            title={isActive ? "Hide" : "Show"}
                          >
                            {isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingLink(convertToPersonalLink(link));
                              setLinkModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteItem({ kind: "link", id: link.id })}
                            className="p-1.5 rounded bg-white/20 hover:bg-red-500/70 text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Regular link or block
            const item = groupedItem as UnifiedItem;
            const index = unifiedItems.indexOf(item);
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
                  data-drag-index={index}
                  draggable
                  onDragStart={() => handleDragStart(index, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index, item)}
                  
                  className={`flex items-center gap-2 p-3 bg-card rounded-xl border transition-all touch-none select-none ${
                    isDragging ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                  } ${isDragEnabled && isDragging ? "scale-105 shadow-xl" : ""} ${isFeatured ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-border"} ${!isActive ? "opacity-50" : ""}`}
                >
                  <div className="p-1 cursor-grab active:cursor-grabbing touch-none select-none">
                    <GripVertical className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div 
                    className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${!link.pill_color ? (config?.gradient || config?.bgColor || "bg-primary/10") : ""}`}
                    style={link.pill_color ? { backgroundColor: link.pill_color } : undefined}
                  >
                    {Icon && <Icon className={`h-5 w-5 ${link.pill_color ? "text-white" : config?.color || "text-primary"}`} />}
                  </div>
                  <div className="flex-1 min-w-0 select-none pointer-events-none">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground select-none">{link.label}</p>
                      {isFeatured && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded select-none">
                          FEATURED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate select-none">{link.url}</p>
                  </div>
                  
                  <button
                    onClick={() => toggleFeatured(link.id, link.is_featured)}
                    className={`p-3 -m-1 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isFeatured ? "text-amber-500 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <Star className={`h-5 w-5 ${isFeatured ? "fill-current" : ""}`} />
                  </button>
                  
                  <button
                    onClick={() => toggleLinkVisibility(link.id, link.is_active)}
                    className={`p-3 -m-1 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isActive ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground/50 bg-muted"}`}
                  >
                    {isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingLink(convertToPersonalLink(link));
                      setLinkModalOpen(true);
                    }}
                    className="p-3 -m-1 hover:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Edit className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteItem({ kind: "link", id: link.id })}
                    className="p-3 -m-1 hover:bg-destructive/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </button>
                </div>
              );
            } else {
              const block = item.data;
              const isActive = block.is_active !== false;

              return (
                <div
                  key={`block-${block.id}`}
                  data-drag-index={index}
                  draggable
                  onDragStart={() => handleDragStart(index, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index, item)}
                  
                  className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border transition-all touch-none select-none ${
                    isDragging ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                  } ${isDragEnabled && isDragging ? "scale-105 shadow-xl" : ""} ${!isActive ? "opacity-50" : ""}`}
                >
                  <div className="p-2 cursor-grab active:cursor-grabbing touch-none select-none">
                    <GripVertical className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {renderBlockIcon(block.block_type)}
                  </div>
                  <div className="flex-1 min-w-0 select-none pointer-events-none">
                    <p className="font-medium text-sm text-foreground select-none">{getBlockLabel(block)}</p>
                    <p className="text-xs text-muted-foreground capitalize select-none">{block.block_type} block</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBlock(block);
                      setBlockModalOpen(true);
                    }}
                    className="p-3 -m-1 hover:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Edit className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteItem({ kind: "block", id: block.id })}
                    className="p-3 -m-1 hover:bg-destructive/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
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
        deferSave={true}
        planType={planType}
        onUpgrade={onUpgrade}
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
