import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkModal } from "@/components/personal/LinkModal";
import { PLATFORM_CONFIGS, getPlatformConfig } from "@/lib/platformLinks";
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Star, 
  Pencil, 
  Trash2 
} from "lucide-react";

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
}

interface Props {
  links: AdminLink[];
  onLinksChange: (links: AdminLink[]) => void;
}

export const AdminLinksManager = ({ links, onLinksChange }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AdminLink | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const existingTypes = links.map(l => l.type);

  const handleAddLink = (linkData: { type: string; value: string; url: string; label: string; pillColor?: string | null; displayStyle?: string }) => {
    const newLink: AdminLink = {
      id: crypto.randomUUID(),
      type: linkData.type,
      label: linkData.label,
      value: linkData.value,
      url: linkData.url,
      pillColor: linkData.pillColor || null,
      displayStyle: (linkData.displayStyle as "pill" | "icon" | "both") || "pill",
      isActive: true,
      isFeatured: false,
      sortOrder: links.length,
    };
    onLinksChange([...links, newLink]);
  };

  const handleUpdateLink = (id: string, updates: Partial<AdminLink>) => {
    onLinksChange(links.map(l => l.id === id ? { ...l, ...updates } : l));
    setEditingLink(null);
  };

  const handleDeleteLink = (id: string) => {
    onLinksChange(links.filter(l => l.id !== id));
  };

  const toggleActive = (id: string) => {
    onLinksChange(links.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  const toggleFeatured = (id: string) => {
    onLinksChange(links.map(l => l.id === id ? { ...l, isFeatured: !l.isFeatured } : l));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newLinks = [...links];
    const draggedItem = newLinks[draggedIndex];
    newLinks.splice(draggedIndex, 1);
    newLinks.splice(index, 0, draggedItem);
    
    // Update sort orders
    newLinks.forEach((link, i) => {
      link.sortOrder = i;
    });
    
    onLinksChange(newLinks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const openEditModal = (link: AdminLink) => {
    setEditingLink(link);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Links</p>
          <p className="text-xs text-muted-foreground">Add all platforms with full customization</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setEditingLink(null);
          setModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No links added yet</p>
          <p className="text-xs">Click "Add Link" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => {
            const config = getPlatformConfig(link.type);
            return (
              <div
                key={link.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-3 bg-card border rounded-lg transition-all ${
                  draggedIndex === index ? "opacity-50" : ""
                } ${!link.isActive ? "opacity-50" : ""}`}
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>

                {config && (
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${config.gradient || config.bgColor}`}>
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.value || link.url}</p>
                </div>

                {link.displayStyle && link.displayStyle !== "pill" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {link.displayStyle === "icon" ? "Icon" : "Both"}
                  </span>
                )}

                <button
                  onClick={() => toggleFeatured(link.id)}
                  className={`p-1.5 rounded hover:bg-muted transition-colors ${
                    link.isFeatured ? "text-yellow-500" : "text-muted-foreground"
                  }`}
                  title={link.isFeatured ? "Unstar" : "Star"}
                >
                  <Star className="h-4 w-4" fill={link.isFeatured ? "currentColor" : "none"} />
                </button>

                <button
                  onClick={() => toggleActive(link.id)}
                  className={`p-1.5 rounded hover:bg-muted transition-colors ${
                    link.isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                  title={link.isActive ? "Hide" : "Show"}
                >
                  {link.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => openEditModal(link)}
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
          })}
        </div>
      )}

      <LinkModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={handleAddLink}
        editingLink={editingLink ? {
          id: editingLink.id,
          type: editingLink.type,
          label: editingLink.label,
          value: editingLink.value,
          url: editingLink.url,
          pillColor: editingLink.pillColor,
          displayStyle: editingLink.displayStyle,
        } : null}
        onUpdate={(id, updates) => handleUpdateLink(id, updates as Partial<AdminLink>)}
        existingTypes={editingLink ? existingTypes.filter(t => t !== editingLink.type) : existingTypes}
      />
    </div>
  );
};
