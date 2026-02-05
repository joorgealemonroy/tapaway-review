import { useState, useCallback } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus,
  GripVertical,
  Trash2,
  Edit,
  Star,
  Eye,
  EyeOff
} from "lucide-react";
import { LinkModal } from "@/components/personal/LinkModal";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";
import { useTouchHoldDrag } from "@/hooks/useTouchHoldDrag";

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

interface PersonalLink {
  id: string;
  type: string;
  label: string;
  value: string;
  url: string;
  pillColor?: string | null;
  displayStyle?: string;
  coverImageUrl?: string | null;
  gridSize?: string | null;
  thumbnailUrl?: string | null;
}

interface Props {
  profileId: string;
  links: DbPersonalLink[];
  onLinksChange: (links: DbPersonalLink[]) => void;
}

export const DashboardLinksManager = ({ profileId, links, onLinksChange }: Props) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Use the touch hold drag hook for better mobile UX
  const handleReorder = useCallback((newLinks: DbPersonalLink[]) => {
    onLinksChange(newLinks);
  }, [onLinksChange]);

  const persistOrder = useCallback(async () => {
    try {
      const updates = links.map((link, i) => ({
        id: link.id,
        sort_order: i,
      }));

      for (const update of updates) {
        await supabase
          .from("personal_links")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to save order");
    }
  }, [links]);

  const {
    draggedIndex,
    isDragEnabled,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragStart,
    handleDragOver,
    handleDragEnd: hookDragEnd,
  } = useTouchHoldDrag({
    items: links,
    onReorder: handleReorder,
    onDragEnd: persistOrder,
    itemHeight: 60,
  });

  const handleDragEnd = () => {
    hookDragEnd();
  };

  const convertToPersonalLink = (dbLink: DbPersonalLink): PersonalLink => ({
    id: dbLink.id,
    type: dbLink.link_type,
    label: dbLink.label,
    value: getPlatformConfig(dbLink.link_type)?.extractValue(dbLink.url) || dbLink.url,
    url: dbLink.url,
    pillColor: dbLink.pill_color,
    displayStyle: dbLink.display_style || "pill",
    coverImageUrl: dbLink.cover_image_url,
    gridSize: dbLink.grid_size,
    thumbnailUrl: dbLink.thumbnail_url,
  });

  const handleAddLink = async (link: Omit<PersonalLink, "id">) => {
    setSaving(true);
    try {
      const newDisplayStyle = link.displayStyle || "pill";
      
      // If adding with "icon" or "both" style, update any existing icon of same type to "pill"
      if (newDisplayStyle === "icon" || newDisplayStyle === "both") {
        const existingIconLink = links.find(
          l => l.link_type === link.type && (l.display_style === "icon" || l.display_style === "both")
        );
        if (existingIconLink) {
          await supabase
            .from("personal_links")
            .update({ display_style: "pill" })
            .eq("id", existingIconLink.id);
          
          // Update local state
          onLinksChange(links.map(l => 
            l.id === existingIconLink.id ? { ...l, display_style: "pill" } : l
          ));
          toast.info("Only one can display as an icon. Previous one changed to button.");
        }
      }

      const newLink = {
        profile_id: profileId,
        link_type: link.type,
        label: link.label,
        url: link.url,
        sort_order: links.length,
        pill_color: link.pillColor || null,
        display_style: newDisplayStyle,
        cover_image_url: link.coverImageUrl || null,
        grid_size: link.gridSize || null,
        thumbnail_url: link.thumbnailUrl || null,
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
      const newDisplayStyle = updates.displayStyle;
      const linkType = updates.type || links.find(l => l.id === id)?.link_type;
      
      // If updating to "icon" or "both" style, update any existing icon of same type to "pill"
      if ((newDisplayStyle === "icon" || newDisplayStyle === "both") && linkType) {
        const existingIconLink = links.find(
          l => l.id !== id && l.link_type === linkType && (l.display_style === "icon" || l.display_style === "both")
        );
        if (existingIconLink) {
          await supabase
            .from("personal_links")
            .update({ display_style: "pill" })
            .eq("id", existingIconLink.id);
          
          // Update local state for the other link
          onLinksChange(links.map(l => 
            l.id === existingIconLink.id ? { ...l, display_style: "pill" } : l
          ));
          toast.info("Only one can display as an icon. Previous one changed to button.");
        }
      }

      const { error } = await supabase
        .from("personal_links")
        .update({
          link_type: updates.type,
          label: updates.label,
          url: updates.url,
          pill_color: updates.pillColor || null,
          display_style: updates.displayStyle,
          cover_image_url: updates.coverImageUrl !== undefined ? updates.coverImageUrl : null,
          grid_size: updates.gridSize !== undefined ? updates.gridSize : null,
          thumbnail_url: updates.thumbnailUrl !== undefined ? updates.thumbnailUrl : null,
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
              display_style: updates.displayStyle || l.display_style,
              cover_image_url: updates.coverImageUrl !== undefined ? updates.coverImageUrl : l.cover_image_url,
              grid_size: updates.gridSize !== undefined ? updates.gridSize : l.grid_size,
              thumbnail_url: updates.thumbnailUrl !== undefined ? updates.thumbnailUrl : l.thumbnail_url,
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

  // Toggle link visibility (show/hide)
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

  // Toggle featured status (only one can be featured)
  const toggleFeatured = async (id: string, currentState: boolean | null) => {
    const newState = !(currentState ?? false);
    try {
      // If setting as featured, first unset any other featured links
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

  const removeLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      onLinksChange(links.filter(l => l.id !== id));
      setDeleteId(null);
      toast.success("Link removed");
    } catch (err) {
      console.error("Error removing link:", err);
      toast.error("Failed to remove link");
    }
  };

  // Don't filter by existing types - allow multiple of same type
  const existingTypes: string[] = [];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">Links</Label>
      
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, index) => {
            const config = getPlatformConfig(link.link_type);
            const Icon = config?.icon;
            const isActive = link.is_active !== false;
            const isFeatured = link.is_featured === true;
            
            return (
              <div
                key={link.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex items-center gap-2 p-3 bg-card rounded-xl border transition-all touch-none select-none ${
                  draggedIndex === index ? "opacity-50 scale-105 shadow-xl ring-2 ring-primary/50" : ""
                } ${isDragEnabled && draggedIndex === index ? "scale-105 shadow-xl" : ""}
                ${isFeatured ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-border"} ${!isActive ? "opacity-50" : ""}`}
              >
                <div className="p-1 cursor-grab active:cursor-grabbing touch-none select-none">
                  <GripVertical className="h-6 w-6 text-muted-foreground" />
                </div>
                <div 
                  className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${!link.pill_color && !link.cover_image_url ? (config?.gradient || config?.bgColor || "bg-primary/10") : ""}`}
                  style={link.pill_color ? { backgroundColor: link.pill_color } : undefined}
                >
                  {link.cover_image_url ? (
                    <img src={link.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : Icon ? (
                    <Icon className={`h-5 w-5 ${link.pill_color ? "text-white" : config?.color || "text-primary"}`} />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 select-none pointer-events-none">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground select-none">{link.label}</p>
                    {isFeatured && (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded select-none">
                        FEATURED
                      </span>
                    )}
                    {link.cover_image_url && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded select-none">
                        COVER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate select-none">{link.url}</p>
                </div>
                
                {/* Feature toggle */}
                <button
                  onClick={() => toggleFeatured(link.id, link.is_featured)}
                  className={`p-3 -m-1 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isFeatured ? "text-amber-500 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:bg-muted"}`}
                  title={isFeatured ? "Remove from featured" : "Make featured"}
                >
                  <Star className={`h-5 w-5 ${isFeatured ? "fill-current" : ""}`} />
                </button>
                
                {/* Visibility toggle */}
                <button
                  onClick={() => toggleLinkVisibility(link.id, link.is_active)}
                  className={`p-3 -m-1 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isActive ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground/50 bg-muted"}`}
                  title={isActive ? "Hide link" : "Show link"}
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
                  onClick={() => setDeleteId(link.id)}
                  className="p-3 -m-1 hover:bg-destructive/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={() => {
          setEditingLink(null);
          setLinkModalOpen(true);
        }}
        className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
      >
        <Plus className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Add a link</span>
      </button>

      {links.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Add your first link to get started
        </p>
      )}

      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={handleAddLink}
        editingLink={editingLink}
        onUpdate={handleUpdateLink}
        existingTypes={existingTypes}
        existingIconTypes={links
          .filter(l => l.display_style === "icon" || l.display_style === "both")
          .map(l => l.link_type)
        }
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && removeLink(deleteId)}
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
