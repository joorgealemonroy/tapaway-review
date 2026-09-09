import { useState } from "react";
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
  Trash2,
  Edit,
  Star,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import { LinkModal } from "@/components/personal/LinkModal";
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
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [moving, setMoving] = useState(false);

  // Simple, reliable reorder via up/down buttons. The previous touch-hold-drag
  // reorder never worked on touch (rows had no data-drag-index target, so drops
  // were silently ignored) and its `touch-none` class blocked page scrolling on
  // rows — so it was replaced with explicit buttons that work on any device.
  const moveLink = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length || moving) return;
    const prev = links;
    const newLinks = [...links];
    const [moved] = newLinks.splice(index, 1);
    newLinks.splice(newIndex, 0, moved);
    onLinksChange(newLinks);
    setMoving(true);
    try {
      const results = await Promise.all(
        newLinks.map((link, i) =>
          supabase.from("personal_links").update({ sort_order: i }).eq("id", link.id),
        ),
      );
      // supabase-js returns errors in the result (it doesn't throw), so check them.
      const failed = results.some((r) => r.error);
      if (failed) {
        console.error("Reorder failed:", results.map((r) => r.error).filter(Boolean));
        onLinksChange(prev); // revert so the list matches the database
        toast.error("Couldn't save the new order — try again.");
      }
    } catch (err) {
      console.error("Reorder error:", err);
      onLinksChange(prev); // revert so the list matches the database
      toast.error("Couldn't save the new order — try again.");
    } finally {
      setMoving(false);
    }
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
    setDeleting(true);
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
    } finally {
      setDeleting(false);
    }
  };

  // Don't filter by existing types - allow multiple of same type
  const existingTypes: string[] = [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-foreground">Links</Label>
        {links.length > 1 && (
          <button
            type="button"
            onClick={() => setReordering((r) => !r)}
            className={`flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors ${
              reordering
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted active:bg-muted"
            }`}
          >
            <ArrowUpDown className="h-4 w-4" />
            {reordering ? "Done" : "Reorder"}
          </button>
        )}
      </div>
      {reordering && links.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Use the arrows to change the order your links appear on your hub.
        </p>
      )}
      
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
                className={`flex items-center gap-1.5 p-3 bg-card rounded-xl border transition-all ${
                  isFeatured ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-border"
                } ${!isActive ? "opacity-50" : ""}`}
              >
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">{link.label}</p>
                    {isFeatured && (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">
                        FEATURED
                      </span>
                    )}
                    {link.cover_image_url && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                        COVER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                </div>
                
                {reordering ? (
                  <>
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0 || moving}
                      aria-label={`Move ${link.label} up`}
                      className="rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === links.length - 1 || moving}
                      aria-label={`Move ${link.label} down`}
                      className="rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Feature toggle */}
                    <button
                      type="button"
                      onClick={() => toggleFeatured(link.id, link.is_featured)}
                      className={`rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isFeatured ? "text-amber-500 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:bg-muted active:bg-muted"}`}
                      title={isFeatured ? "Remove from featured" : "Make featured"}
                      aria-label={isFeatured ? `Unfeature ${link.label}` : `Feature ${link.label}`}
                    >
                      <Star className={`h-5 w-5 ${isFeatured ? "fill-current" : ""}`} />
                    </button>
                    
                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={() => toggleLinkVisibility(link.id, link.is_active)}
                      className={`rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isActive ? "text-muted-foreground hover:bg-muted active:bg-muted" : "text-muted-foreground/50 bg-muted"}`}
                      title={isActive ? "Hide link" : "Show link"}
                      aria-label={isActive ? `Hide ${link.label}` : `Show ${link.label}`}
                    >
                      {isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLink(convertToPersonalLink(link));
                        setLinkModalOpen(true);
                      }}
                      aria-label={`Edit ${link.label}`}
                      className="hover:bg-muted active:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(link.id)}
                      aria-label={`Remove ${link.label}`}
                      className="hover:bg-destructive/10 active:bg-destructive/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button 
        type="button"
        onClick={() => {
          setEditingLink(null);
          setLinkModalOpen(true);
        }}
        className="w-full flex items-center gap-3 p-4 min-h-[56px] bg-muted/50 hover:bg-muted active:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
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
        saving={saving}
        existingTypes={existingTypes}
        existingIconTypes={links
          .filter(l => l.display_style === "icon" || l.display_style === "both")
          .map(l => l.link_type)
        }
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => { if (!deleting) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && removeLink(deleteId)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
