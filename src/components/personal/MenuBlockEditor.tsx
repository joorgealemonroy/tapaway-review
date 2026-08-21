import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Wand2,
  Download,
  Loader2,
  Camera,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageOptimization";
import {
  countMenuItems,
  parseMenuText,
  mergeMenuSections,
  menuSectionsToText,
  type MenuSection,
} from "@/lib/menuBlock";

interface Props {
  sections: MenuSection[];
  onSectionsChange: (sections: MenuSection[]) => void;
}

const MAX_PHOTOS = 15;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

interface MenuPhoto {
  id: string;
  file: File;
  preview: string;
}

export const MenuBlockEditor = ({ sections, onSectionsChange }: Props) => {
  const [pasteText, setPasteText] = useState("");
  const [importSlug, setImportSlug] = useState("");
  const [importing, setImporting] = useState(false);
  const [photos, setPhotos] = useState<MenuPhoto[]>([]);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (next: MenuSection[]) => onSectionsChange(next);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming: MenuPhoto[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_PHOTO_BYTES) {
        rejected++;
        continue;
      }
      incoming.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (rejected > 0) toast.error(`${rejected} photo(s) over 20MB were skipped`);
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      if (room <= 0) {
        toast.error(`You can read up to ${MAX_PHOTOS} photos at a time`);
        return prev;
      }
      if (incoming.length > room) toast.error(`Only the first ${room} photo(s) were added`);
      return [...prev, ...incoming.slice(0, room)];
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  };

  const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that photo"));
      reader.readAsDataURL(blob);
    });

  const handleReadPhotos = async () => {
    if (photos.length === 0 || reading) return;
    setReading(true);
    try {
      const images: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Preparing page ${i + 1} of ${photos.length}…`);
        // JPEG keeps OCR detail while staying small enough to send inline.
        const blob = await compressImage(photos[i].file, 1600, 0.9);
        const jpeg = blob.type === "image/jpeg" ? blob : new Blob([blob], { type: blob.type });
        images.push(await toDataUrl(jpeg));
      }

      setProgress(`Reading ${photos.length} page${photos.length === 1 ? "" : "s"}…`);
      const { data, error } = await supabase.functions.invoke("parse-menu-image", {
        body: { images },
      });

      const payload = (data ?? {}) as {
        success?: boolean;
        error?: string;
        skipped?: number[];
        menu?: { sections?: MenuSection[] };
      };

      if (error && !payload.success) {
        throw new Error(payload.error || error.message);
      }
      if (!payload.success) {
        throw new Error(payload.error || "Couldn't read that menu");
      }

      const read = mergeMenuSections([payload.menu?.sections ?? []]);
      if (read.length === 0) throw new Error("No menu items were found in those photos");

      const next = mergeMenuSections([sections, read]);
      update(next);
      setPasteText(menuSectionsToText(next));
      clearPhotos();

      const skipped = payload.skipped?.length ?? 0;
      toast.success(
        `Added ${read.length} sections (${countMenuItems(read)} items)` +
          (skipped > 0 ? ` — ${skipped} page(s) couldn't be read` : "")
      );
    } catch (err) {
      console.error("Menu photo read error:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't read those photos");
    } finally {
      setProgress("");
      setReading(false);
    }
  };

  const updateSection = (index: number, patch: Partial<MenuSection>) => {
    update(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const handlePasteImport = () => {
    const parsed = parseMenuText(pasteText);
    if (parsed.length === 0) {
      toast.error("Couldn't read any items from that text");
      return;
    }
    update([...sections, ...parsed]);
    setPasteText("");
    toast.success(`Added ${parsed.length} sections (${countMenuItems(parsed)} items)`);
  };

  const handleHubImport = async () => {
    const slug = importSlug.trim().replace(/^\/+/, "").toLowerCase();
    if (!slug) {
      toast.error("Enter the hub address to import from");
      return;
    }
    setImporting(true);
    try {
      const { data: hub, error: hubError } = await supabase.rpc("get_public_restaurant_hub", {
        _slug: slug,
      });
      if (hubError) throw hubError;
      const restaurantId = Array.isArray(hub) ? hub[0]?.id : undefined;
      if (!restaurantId) {
        toast.error("No business hub found at that address");
        return;
      }

      const { data: menu, error: menuError } = await supabase.rpc("get_public_restaurant_menu", {
        _restaurant_id: restaurantId,
      });
      if (menuError) throw menuError;

      const imported: MenuSection[] = (menu || []).map((section: Record<string, unknown>) => ({
        name: String(section.name ?? "").trim(),
        items: (Array.isArray(section.items) ? section.items : []).map((item: Record<string, unknown>) => ({
          name: String(item?.name ?? "").trim(),
          description: item?.description ? String(item.description) : "",
          price:
            item?.price === null || item?.price === undefined || item?.price === ""
              ? ""
              : `$${String(item.price).replace(/^\$/, "")}`,
          hidden: false,
        })),
      }));

      if (imported.length === 0) {
        toast.error("That hub has no menu items yet");
        return;
      }

      update([...sections, ...imported]);
      toast.success(`Imported ${imported.length} sections (${countMenuItems(imported)} items)`);
      setImportSlug("");
    } catch (err) {
      console.error("Menu import error:", err);
      toast.error("Failed to import menu");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Snap the menu */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Snap the menu
          </Label>
          {photos.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {photos.length} / {MAX_PHOTOS}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Take or upload up to {MAX_PHOTOS} photos of the printed menu — AI reads every page and
          builds the sections for you.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-11"
          disabled={reading || photos.length >= MAX_PHOTOS}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          Add menu photos
        </Button>

        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                <img src={photo.preview} alt={`Menu page ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  disabled={reading}
                  aria-label={`Remove page ${index + 1}`}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 border border-border flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-0 left-0 px-1.5 py-0.5 text-[10px] bg-background/80 rounded-tr">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1 h-11"
              onClick={handleReadPhotos}
              disabled={reading}
            >
              {reading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {reading ? progress || "Reading…" : "Read menu from photos"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearPhotos} disabled={reading}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Fast entry */}
      <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">

        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add the whole menu at once
        </Label>
        <Textarea
          rows={5}
          placeholder={"TACOS\nCarne Asada - grilled steak 3.50\nAl Pastor 3.25\n\nDRINKS\nHorchata 4"}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="text-sm font-mono"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handlePasteImport} disabled={!pasteText.trim()}>
          <Wand2 className="h-4 w-4 mr-2" />
          Build menu from text
        </Button>

        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Import from hub address (e.g. islasmarias)"
            value={importSlug}
            onChange={(e) => setImportSlug(e.target.value)}
            className="h-9 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleHubImport} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={section.name}
                placeholder="Section name (e.g. Tacos)"
                onChange={(e) => updateSection(sectionIndex, { name: e.target.value })}
                className="h-9 font-semibold"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(sectionIndex, -1)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(sectionIndex, 1)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => update(sections.filter((_, i) => i !== sectionIndex))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="rounded-lg bg-muted/40 p-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={item.name}
                      placeholder="Item name"
                      onChange={(e) =>
                        updateSection(sectionIndex, {
                          items: section.items.map((it, i) =>
                            i === itemIndex ? { ...it, name: e.target.value } : it
                          ),
                        })
                      }
                      className="h-9"
                    />
                    <Input
                      value={item.price || ""}
                      placeholder="$0.00"
                      onChange={(e) =>
                        updateSection(sectionIndex, {
                          items: section.items.map((it, i) =>
                            i === itemIndex ? { ...it, price: e.target.value } : it
                          ),
                        })
                      }
                      className="h-9 w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        updateSection(sectionIndex, {
                          items: section.items.filter((_, i) => i !== itemIndex),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    value={item.description || ""}
                    placeholder="Description (optional)"
                    onChange={(e) =>
                      updateSection(sectionIndex, {
                        items: section.items.map((it, i) =>
                          i === itemIndex ? { ...it, description: e.target.value } : it
                        ),
                      })
                    }
                    className="h-8 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!item.hidden}
                      onCheckedChange={(checked) =>
                        updateSection(sectionIndex, {
                          items: section.items.map((it, i) =>
                            i === itemIndex ? { ...it, hidden: !checked } : it
                          ),
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.hidden ? "Hidden from visitors" : "Visible"}
                    </span>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  updateSection(sectionIndex, {
                    items: [...section.items, { name: "", description: "", price: "", hidden: false }],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add item
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => update([...sections, { name: "", items: [] }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add section
      </Button>

      {sections.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {sections.length} sections · {countMenuItems(sections)} items
        </p>
      )}
    </div>
  );
};
