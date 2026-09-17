import { ChangeEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GalleryVerticalEnd, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useCardShowcase } from "@/hooks/useCardShowcase";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import type { CardDesign } from "@/types/cardShowcase";

const CardShowcaseScene = lazy(() => import("@/components/card-showcase/CardShowcaseScene"));

const BUCKET = "restaurant-logos";
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const TARGET_RATIO = 53.98 / 85.6;

interface ValidatedFile { file: File; url: string; width: number; height: number }

const validateImage = async (file: File): Promise<ValidatedFile> => {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Use a PNG, JPG, or WebP image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each image must be 10 MB or smaller.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth < 600 || image.naturalHeight < 900) throw new Error("Artwork must be at least 600 × 900 pixels.");
    const ratio = image.naturalWidth / image.naturalHeight;
    if (Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO > 0.08) throw new Error("Artwork must use a portrait card shape close to 53.98 × 85.60 mm.");
    return { file, url, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

const extensionFor = (file: File) => file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

const uploadUnique = async (file: File, face: "front" | "back") => {
  const path = `card-showcase/${crypto.randomUUID()}-${face}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
};

const cleanupPaths = async (paths: Array<string | null | undefined>) => {
  const valid = paths.filter((path): path is string => Boolean(path));
  if (valid.length) await supabase.storage.from(BUCKET).remove(valid);
};

export default function AdminCardShowcase() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const { designs, loading, reload } = useCardShowcase(true);
  const [editing, setEditing] = useState<CardDesign | null | "new">(null);
  const [deleting, setDeleting] = useState<CardDesign | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [front, setFront] = useState<ValidatedFile | null>(null);
  const [back, setBack] = useState<ValidatedFile | null>(null);
  const [saving, setSaving] = useState(false);

  const current = editing === "new" ? null : editing;
  const frontPreview = front?.url ?? current?.frontImageUrl ?? null;
  const backPreview = back?.url ?? current?.backImageUrl ?? null;
  const previewDesign = useMemo<CardDesign | null>(() => frontPreview ? {
    id: `${current?.id ?? "new"}-${frontPreview}-${backPreview ?? "blank"}`,
    businessName: businessName.trim() || "Card preview",
    frontImageUrl: frontPreview,
    backImageUrl: backPreview,
    frontImagePath: current?.frontImagePath ?? "preview",
    backImagePath: current?.backImagePath ?? null,
    enabled: true,
    sortOrder: current?.sortOrder ?? 0,
  } : null, [backPreview, businessName, current, frontPreview]);
  const ordered = useMemo(() => [...designs].sort((a, b) => a.sortOrder - b.sortOrder), [designs]);

  useEffect(() => () => {
    if (front?.url) URL.revokeObjectURL(front.url);
    if (back?.url) URL.revokeObjectURL(back.url);
  }, [front, back]);

  const openEditor = (item: CardDesign | "new") => {
    setEditing(item);
    setBusinessName(item === "new" ? "" : item.businessName);
    setFront(null);
    setBack(null);
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>, face: "front" | "back") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const validated = await validateImage(file);
      if (face === "front") setFront(validated); else setBack(validated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That image could not be read.");
    }
  };

  const save = async () => {
    const name = businessName.trim();
    if (!name) return toast.error("Enter the business name.");
    if (!front && !current) return toast.error("Choose front artwork.");
    setSaving(true);
    const uploaded: string[] = [];
    try {
      const frontPath = front ? await uploadUnique(front.file, "front") : current?.frontImagePath;
      if (frontPath && front) uploaded.push(frontPath);
      const backPath = back ? await uploadUnique(back.file, "back") : current?.backImagePath ?? null;
      if (backPath && back) uploaded.push(backPath);
      if (!frontPath) throw new Error("Front artwork is required.");

      if (current) {
        const { error } = await supabase.from("card_showcase_items").update({
          business_name: name,
          front_image_path: frontPath,
          back_image_path: backPath,
        }).eq("id", current.id);
        if (error) throw error;
        await cleanupPaths([
          front && current.frontImagePath !== frontPath ? current.frontImagePath : null,
          back && current.backImagePath !== backPath ? current.backImagePath : null,
        ]);
      } else {
        const nextOrder = ordered.length ? Math.max(...ordered.map((item) => item.sortOrder)) + 1 : 0;
        const { error } = await supabase.from("card_showcase_items").insert({
          business_name: name,
          front_image_path: frontPath,
          back_image_path: backPath,
          is_enabled: true,
          sort_order: nextOrder,
        });
        if (error) throw error;
      }
      toast.success(current ? "Showcase design updated." : "Showcase design added.");
      setEditing(null);
      await reload();
    } catch (error) {
      await cleanupPaths(uploaded);
      toast.error(error instanceof Error ? error.message : "The design could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: CardDesign) => {
    const { error } = await supabase.from("card_showcase_items").update({ is_enabled: !item.enabled }).eq("id", item.id);
    if (error) toast.error(error.message); else await reload();
  };

  const move = async (item: CardDesign, direction: -1 | 1) => {
    const position = ordered.findIndex((entry) => entry.id === item.id);
    const other = ordered[position + direction];
    if (!other) return;
    const [{ error: firstError }, { error: secondError }] = await Promise.all([
      supabase.from("card_showcase_items").update({ sort_order: other.sortOrder }).eq("id", item.id),
      supabase.from("card_showcase_items").update({ sort_order: item.sortOrder }).eq("id", other.id),
    ]);
    if (firstError || secondError) toast.error(firstError?.message ?? secondError?.message); else await reload();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("card_showcase_items").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    await cleanupPaths([deleting.frontImagePath, deleting.backImagePath]);
    setDeleting(null);
    await reload();
    toast.success("Showcase design removed.");
  };

  if (guardLoading || loading) return <div className="min-h-screen bg-background grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 pb-12">
        <AdminPageHeader title="Card Showcase" subtitle="Homepage printed-card rotation" icon={<GalleryVerticalEnd className="h-5 w-5 text-primary" />} actions={<Button size="sm" onClick={() => openEditor("new")}><Plus /> Add design</Button>} />
        <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Material reference:</strong> attached physical Sugar Bloom PVC card photograph.</p>
          <p><strong className="text-foreground">Visual direction:</strong> generated Sugar Bloom showcase picture. Uploaded flat artwork remains the exact card texture.</p>
        </div>
        {ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-20 text-center"><GalleryVerticalEnd className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No showcase designs</p><p className="mt-1 text-sm text-muted-foreground">The homepage respects this empty state.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((item, position) => (
              <article key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div><img src={item.frontImageUrl} alt={`${item.businessName} front`} className="mx-auto aspect-[53.98/85.6] max-h-56 rounded-md bg-muted object-contain" /><p className="mt-1 text-center text-xs text-muted-foreground">Front</p></div>
                  <div>{item.backImageUrl ? <img src={item.backImageUrl} alt={`${item.businessName} back`} className="mx-auto aspect-[53.98/85.6] max-h-56 rounded-md bg-muted object-contain" /> : <div className="mx-auto grid aspect-[53.98/85.6] max-h-56 place-items-center rounded-md border bg-background px-2 text-center text-xs text-muted-foreground">Blank white back</div>}<p className="mt-1 text-center text-xs text-muted-foreground">Back</p></div>
                </div>
                <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{item.businessName}</h2><p className="text-xs text-muted-foreground">Position {position + 1}</p></div><Switch checked={item.enabled} onCheckedChange={() => void toggle(item)} aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.businessName}`} /></div>
                <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="icon" aria-label="Move earlier" disabled={position === 0} onClick={() => void move(item, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" aria-label="Move later" disabled={position === ordered.length - 1} onClick={() => void move(item, 1)}><ArrowDown /></Button>
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" aria-label={`Edit ${item.businessName}`} onClick={() => openEditor(item)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${item.businessName}`} onClick={() => setDeleting(item)}><Trash2 className="text-destructive" /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{current ? "Edit showcase design" : "Add showcase design"}</DialogTitle><DialogDescription>Use the original flat print artwork. The preview shows how the complete image fits the card face.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div><Label htmlFor="showcase-business">Business name</Label><Input id="showcase-business" value={businessName} maxLength={120} onChange={(event) => setBusinessName(event.target.value)} /></div>
            {previewDesign && <div className="mx-auto aspect-[53.98/85.6] w-[min(250px,70vw)]" aria-label="Reusable physical card preview"><Suspense fallback={null}><CardShowcaseScene design={previewDesign} paused={false} visible mobile={false} interactive onReady={() => undefined} onCycle={() => undefined} /></Suspense></div>}
            <div className="grid gap-5 sm:grid-cols-2">
              {(["front", "back"] as const).map((face) => {
                const preview = face === "front" ? frontPreview : backPreview;
                const selected = face === "front" ? front : back;
                return <div key={face} className="space-y-2"><Label htmlFor={`${face}-artwork`}>{face === "front" ? "Front artwork" : "Back artwork (optional)"}</Label><div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-muted/30 p-3">{preview ? <img src={preview} alt={`${face} fit preview`} className="aspect-[53.98/85.6] max-h-64 rounded-md bg-background object-contain" /> : <div className="text-center text-sm text-muted-foreground"><ImagePlus className="mx-auto mb-2 h-7 w-7" />Blank white back</div>}</div>{selected && <p className="text-xs text-muted-foreground">{selected.width} × {selected.height}px · full image fitted</p>}<Input id={`${face}-artwork`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseFile(event, face)} /></div>;
              })}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="animate-spin" />}{current ? "Save changes" : "Add design"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {deleting?.businessName}?</AlertDialogTitle><AlertDialogDescription>This removes the entry and its uploaded showcase artwork. It does not affect the client account or public hub.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}