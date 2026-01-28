import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LinkModal } from "@/components/personal/LinkModal";
import { BlockModal } from "@/components/personal/BlockModal";
import { PLATFORM_CONFIGS, getPlatformConfig } from "@/lib/platformLinks";
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Star, 
  Pencil, 
  Trash2,
  Youtube,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Mail,
  Grid,
  Link as LinkIcon
} from "lucide-react";
import { useTouchHoldDrag } from "@/hooks/useTouchHoldDrag";

export interface AdminLink {
  id: string;
  type: string;
  label: string;
  value: string;
  url: string;
  pillColor?: string | null;
  displayStyle?: "pill" | "icon" | "both";
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  coverImageUrl?: string | null;
  gridSize?: string | null;
  thumbnailUrl?: string | null;
}

export interface AdminBlock {
  id: string;
  block_type: string;
  content: Record<string, unknown>;
  alignment: string;
  sort_order: number;
  is_active: boolean;
}

type UnifiedItem = 
  | { kind: "link"; data: AdminLink }
  | { kind: "block"; data: AdminBlock };

interface Props {
  links: AdminLink[];
  blocks: AdminBlock[];
  onLinksChange: (links: AdminLink[]) => void;
  onBlocksChange: (blocks: AdminBlock[]) => void;
}

const BLOCK_TYPE_INFO: Record<string, { label: string; icon: React.ElementType }> = {
  youtube: { label: "YouTube Video", icon: Youtube },
  image: { label: "Image", icon: ImageIcon },
  text: { label: "Text", icon: Type },
  button: { label: "Featured Button", icon: MousePointerClick },
  email_capture: { label: "Email Capture", icon: Mail },
  photo_collage: { label: "Photo Collage", icon: Grid },
};

export const AdminUnifiedContent = ({ links, blocks, onLinksChange, onBlocksChange }: Props) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AdminLink | null>(null);
  const [editingBlock, setEditingBlock] = useState<AdminBlock | null>(null);

  // Combine links and blocks into a unified list, sorted by sort_order
  const unifiedItems: UnifiedItem[] = [
    ...links.map(l => ({ kind: "link" as const, data: l })),
    ...blocks.map(b => ({ kind: "block" as const, data: b })),
  ].sort((a, b) => {
    const aOrder = a.kind === "link" ? a.data.sortOrder : a.data.sort_order;
    const bOrder = b.kind === "link" ? b.data.sortOrder : b.data.sort_order;
    return aOrder - bOrder;
  });

  // Group consecutive grid links for 2-column rendering
  type GroupedItem = 
    | { kind: "grid-group"; links: AdminLink[] }
    | UnifiedItem;
  
  const groupedItems: GroupedItem[] = [];
  let currentGridGroup: AdminLink[] = [];
  
  for (const item of unifiedItems) {
    if (item.kind === "link" && item.data.coverImageUrl && item.data.gridSize === "half" && !item.data.isFeatured) {
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

  const getSortOrder = (item: UnifiedItem): number => {
    return item.kind === "link" ? item.data.sortOrder : item.data.sort_order;
  };

  const updateSortOrders = useCallback((items: UnifiedItem[]) => {
    const newLinks: AdminLink[] = [];
    const newBlocks: AdminBlock[] = [];
    
    items.forEach((item, index) => {
      if (item.kind === "link") {
        newLinks.push({ ...item.data, sortOrder: index });
      } else {
        newBlocks.push({ ...item.data, sort_order: index });
      }
    });
    
    onLinksChange(newLinks);
    onBlocksChange(newBlocks);
  }, [onLinksChange, onBlocksChange]);

  // Touch hold drag hook for better mobile UX
  const handleReorder = useCallback((newItems: UnifiedItem[]) => {
    updateSortOrders(newItems);
  }, [updateSortOrders]);

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
    items: unifiedItems,
    onReorder: handleReorder,
    itemHeight: 60,
  });

  // Link handlers
  const handleAddLink = (linkData: { type: string; value: string; url: string; label: string; pillColor?: string | null; displayStyle?: string; coverImageUrl?: string | null; gridSize?: string | null; thumbnailUrl?: string | null }) => {
    const newDisplayStyle = (linkData.displayStyle as "pill" | "icon" | "both") || "pill";
    const maxOrder = unifiedItems.length > 0 ? Math.max(...unifiedItems.map(getSortOrder)) : -1;
    
    let updatedLinks = [...links];
    if (newDisplayStyle === "icon" || newDisplayStyle === "both") {
      const existingIconLink = links.find(
        l => l.type === linkData.type && (l.displayStyle === "icon" || l.displayStyle === "both")
      );
      if (existingIconLink) {
        updatedLinks = links.map(l => 
          l.id === existingIconLink.id ? { ...l, displayStyle: "pill" as const } : l
        );
      }
    }

    const newLink: AdminLink = {
      id: crypto.randomUUID(),
      type: linkData.type,
      label: linkData.label,
      value: linkData.value,
      url: linkData.url,
      pillColor: linkData.pillColor || null,
      displayStyle: newDisplayStyle,
      isActive: true,
      isFeatured: false,
      sortOrder: maxOrder + 1,
      coverImageUrl: linkData.coverImageUrl || null,
      gridSize: linkData.gridSize || null,
      thumbnailUrl: linkData.thumbnailUrl || null,
    };
    onLinksChange([...updatedLinks, newLink]);
  };

  const handleUpdateLink = (id: string, updates: Partial<AdminLink>) => {
    const newDisplayStyle = updates.displayStyle;
    const linkType = updates.type || links.find(l => l.id === id)?.type;
    
    let updatedLinks = links;
    if ((newDisplayStyle === "icon" || newDisplayStyle === "both") && linkType) {
      const existingIconLink = links.find(
        l => l.id !== id && l.type === linkType && (l.displayStyle === "icon" || l.displayStyle === "both")
      );
      if (existingIconLink) {
        updatedLinks = links.map(l => 
          l.id === existingIconLink.id ? { ...l, displayStyle: "pill" as const } : l
        );
      }
    }
    
    onLinksChange(updatedLinks.map(l => l.id === id ? { ...l, ...updates } : l));
    setEditingLink(null);
  };

  const handleDeleteLink = (id: string) => {
    onLinksChange(links.filter(l => l.id !== id));
  };

  const toggleLinkActive = (id: string) => {
    onLinksChange(links.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  const toggleLinkFeatured = (id: string) => {
    onLinksChange(links.map(l => l.id === id ? { ...l, isFeatured: !l.isFeatured } : l));
  };

  // Block handlers
  const handleBlockSaved = (block: { id: string; block_type: string; content: unknown; alignment: string | null; sort_order: number; is_active?: boolean | null }) => {
    const existingIndex = blocks.findIndex(b => b.id === block.id);
    const maxOrder = unifiedItems.length > 0 ? Math.max(...unifiedItems.map(getSortOrder)) : -1;
    
    const normalizedBlock: AdminBlock = {
      id: block.id,
      block_type: block.block_type,
      content: block.content as Record<string, unknown>,
      alignment: block.alignment || "center",
      sort_order: existingIndex >= 0 ? block.sort_order : maxOrder + 1,
      is_active: block.is_active ?? true,
    };

    if (existingIndex >= 0) {
      const newBlocks = [...blocks];
      newBlocks[existingIndex] = normalizedBlock;
      onBlocksChange(newBlocks);
    } else {
      onBlocksChange([...blocks, normalizedBlock]);
    }
    setBlockModalOpen(false);
    setEditingBlock(null);
  };

  const handleDeleteBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
  };

  const toggleBlockActive = (id: string) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
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

  const currentMaxOrder = unifiedItems.length > 0 
    ? Math.max(...unifiedItems.map(getSortOrder)) 
    : 0;

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Content</p>
          <p className="text-xs text-muted-foreground">Links and blocks in display order</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setEditingLink(null);
            setLinkModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setEditingBlock(null);
            setBlockModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Block
          </Button>
        </div>
      </div>

      {groupedItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No content added yet</p>
          <p className="text-xs">Add links and blocks to build the profile</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupedItems.map((groupedItem, groupIdx) => {
            // Grid group - render as 2-column grid
            if (groupedItem.kind === "grid-group") {
              return (
                <div key={`grid-group-${groupIdx}`} className="grid grid-cols-3 gap-2">
                  {groupedItem.links.map((link) => {
                    const index = unifiedItems.findIndex(
                      (i) => i.kind === "link" && i.data.id === link.id
                    );
                    const config = getPlatformConfig(link.type);
                    return (
                      <div
                        key={`link-${link.id}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, index)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`relative aspect-video rounded-lg overflow-hidden border bg-card transition-all touch-none select-none group ${
                          draggedIndex === index ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                        } ${isDragEnabled && draggedIndex === index ? "scale-105 shadow-xl" : ""} ${!link.isActive ? "opacity-50" : ""}`}
                      >
                        {/* Cover image */}
                        {link.coverImageUrl && (
                          <img
                            src={link.coverImageUrl}
                            alt={link.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Platform icon badge */}
                        {config && (
                          <div
                            className={`absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center ${config.gradient || config.bgColor}`}
                          >
                            <config.icon className={`h-3 w-3 ${config.color}`} />
                          </div>
                        )}

                        {/* Drag handle */}
                        <div className="absolute top-2 right-2 cursor-grab text-white/70 hover:text-white">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Label */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="text-white font-bold text-xs drop-shadow-lg uppercase tracking-wide line-clamp-2">
                            {link.label}
                          </span>
                        </div>

                        {/* Actions overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleLinkFeatured(link.id)}
                            className={`p-1.5 rounded bg-white/20 hover:bg-white/30 transition-colors ${
                              link.isFeatured ? "text-yellow-400" : "text-white"
                            }`}
                            title={link.isFeatured ? "Unstar" : "Star"}
                          >
                            <Star className="h-3.5 w-3.5" fill={link.isFeatured ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => toggleLinkActive(link.id)}
                            className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                            title={link.isActive ? "Hide" : "Show"}
                          >
                            {link.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingLink(link);
                              setLinkModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
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

            if (item.kind === "link") {
              const link = item.data;
              const config = getPlatformConfig(link.type);
              return (
                <div
                  key={`link-${link.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-2 p-3 bg-card border rounded-lg transition-all touch-none select-none ${
                    draggedIndex === index ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                  } ${isDragEnabled && draggedIndex === index ? "scale-105 shadow-xl" : ""} ${!link.isActive ? "opacity-50" : ""}`}
                >
                  <div className="cursor-grab text-muted-foreground hover:text-foreground touch-none">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {config ? (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.gradient || config.bgColor}`}>
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                  ) : link.thumbnailUrl ? (
                    <div className="h-8 w-8 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <LinkIcon className="h-4 w-4 text-foreground" />
                    </div>
                  )}

                  {/* Show thumbnail badge if present */}
                  {link.thumbnailUrl && config && (
                    <div className="h-6 w-6 rounded overflow-hidden bg-muted flex-shrink-0 -ml-1">
                      <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 overflow-hidden select-none pointer-events-none">
                    <p className="font-medium text-sm truncate select-none">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-full select-none">{link.value || link.url}</p>
                  </div>

                  {link.displayStyle && link.displayStyle !== "pill" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {link.displayStyle === "icon" ? "Icon" : "Both"}
                    </span>
                  )}

                  <button
                    onClick={() => toggleLinkFeatured(link.id)}
                    className={`p-1.5 rounded hover:bg-muted transition-colors ${
                      link.isFeatured ? "text-yellow-500" : "text-muted-foreground"
                    }`}
                    title={link.isFeatured ? "Unstar" : "Star"}
                  >
                    <Star className="h-4 w-4" fill={link.isFeatured ? "currentColor" : "none"} />
                  </button>

                  <button
                    onClick={() => toggleLinkActive(link.id)}
                    className={`p-1.5 rounded hover:bg-muted transition-colors ${
                      link.isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                    title={link.isActive ? "Hide" : "Show"}
                  >
                    {link.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingLink(link);
                      setLinkModalOpen(true);
                    }}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            } else {
              const block = item.data;
              const typeInfo = BLOCK_TYPE_INFO[block.block_type] || { label: block.block_type, icon: Type };
              const Icon = typeInfo.icon;
              
              return (
                <div
                  key={`block-${block.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`flex items-center gap-2 p-3 bg-card border rounded-lg transition-all touch-none select-none ${
                    draggedIndex === index ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                  } ${isDragEnabled && draggedIndex === index ? "scale-105 shadow-xl" : ""} ${!block.is_active ? "opacity-50" : ""}`}
                >
                  <div className="cursor-grab text-muted-foreground hover:text-foreground touch-none select-none">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>

                  <div className="flex-1 min-w-0 select-none pointer-events-none">
                    <p className="font-medium text-sm select-none">{typeInfo.label}</p>
                    <p className="text-xs text-muted-foreground truncate select-none">
                      {getBlockPreview(block)}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleBlockActive(block.id)}
                    className={`p-1.5 rounded hover:bg-muted transition-colors ${
                      block.is_active ? "text-foreground" : "text-muted-foreground"
                    }`}
                    title={block.is_active ? "Hide" : "Show"}
                  >
                    {block.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingBlock(block);
                      setBlockModalOpen(true);
                    }}
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
            }
          })}
        </div>
      )}

      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={handleAddLink}
        editingLink={editingLink ? {
          id: editingLink.id,
          type: editingLink.type,
          label: editingLink.label,
          value: editingLink.value,
          url: editingLink.url,
          pillColor: editingLink.pillColor,
          displayStyle: editingLink.displayStyle,
          coverImageUrl: editingLink.coverImageUrl,
          gridSize: editingLink.gridSize,
          thumbnailUrl: editingLink.thumbnailUrl,
        } : null}
        onUpdate={(id, updates) => handleUpdateLink(id, updates as Partial<AdminLink>)}
        existingTypes={[]}
        existingIconTypes={links
          .filter(l => l.displayStyle === "icon" || l.displayStyle === "both")
          .map(l => l.type)
        }
      />

      <BlockModal
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        profileId=""
        editingBlock={editingBlock}
        currentMaxOrder={currentMaxOrder}
        onBlockSaved={handleBlockSaved}
        deferSave={true}
      />
    </div>
  );
};
