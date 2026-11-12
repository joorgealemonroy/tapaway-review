import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Archive, ArrowUpRight, Copy, Download, Loader2, MapPin, Pencil, Plus, QrCode, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileLocation, profileLocationUrl } from "@/lib/profileLocations";

interface Props { profileId: string; username: string; onUpdated?: () => void; }
type LocationDraft = Pick<ProfileLocation, "name" | "subtitle" | "address" | "directions_url" | "image_url" | "is_placeholder" | "restock_note">;
const emptyDraft = (): LocationDraft => ({ name: "", subtitle: "", address: "", directions_url: "", image_url: "", is_placeholder: true, restock_note: "" });
const httpsOrEmpty = (value: string | null, allowLocalImage = false) => {
  if (!value?.trim()) return true;
  if (allowLocalImage && /^\/(?!\/)[^\s<>\\]+$/.test(value.trim())) return true;
  try { return new URL(value.trim()).protocol === "https:"; } catch { return false; }
};

export default function DashboardLocationsTab({ profileId, username, onUpdated }: Props) {
  const [locations, setLocations] = useState<ProfileLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProfileLocation | "new" | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [qr, setQr] = useState<{ name: string; url: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setError(null);
    try {
      const { data, error: queryError } = await (supabase.from("profile_locations" as any) as any)
        .select("*").eq("profile_id", profileId).order("sort_order").order("created_at");
      if (queryError) throw queryError;
      if (request === requestId.current) setLocations(data ?? []);
    } catch { if (request === requestId.current) setError("Couldn't load locations. Please try again."); }
    finally { if (request === requestId.current) setLoading(false); }
  }, [profileId]);

  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);
  const active = locations.filter(location => location.is_active);
  const archived = locations.filter(location => !location.is_active);

  const edit = (location?: ProfileLocation) => {
    setEditing(location ?? "new");
    setDraft(location ? { name: location.name, subtitle: location.subtitle ?? "", address: location.address ?? "", directions_url: location.directions_url ?? "", image_url: location.image_url ?? "", is_placeholder: location.is_placeholder, restock_note: location.restock_note ?? "" } : emptyDraft());
  };
  const patch = (value: Partial<LocationDraft>) => setDraft(current => ({ ...current, ...value }));
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy the link. Select and copy the address instead."); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) { toast.error("Add a location name."); return; }
    if (!httpsOrEmpty(draft.directions_url) || !httpsOrEmpty(draft.image_url, true)) { toast.error("Use a full https:// directions link and a valid image address."); return; }
    if (!draft.is_placeholder && !draft.address?.trim()) { toast.error("Add the store address before making this a real location."); return; }
    setSaving(true);
    try {
      const values = { name: draft.name.trim(), subtitle: draft.subtitle?.trim() || null, address: draft.address?.trim() || null, directions_url: draft.directions_url?.trim() || null, image_url: draft.image_url?.trim() || null, is_placeholder: draft.is_placeholder, restock_note: draft.restock_note?.trim() || null };
      const table = supabase.from("profile_locations" as any) as any;
      const result = editing === "new"
        ? await table.insert({ ...values, profile_id: profileId, slug: `location-${crypto.randomUUID().slice(0, 8)}`, sort_order: Math.max(-1, ...locations.map(location => location.sort_order)) + 1 }).select("id").single()
        : await table.update(values).eq("id", editing?.id).eq("profile_id", profileId).select("id").single();
      if (result.error) throw result.error;
      setEditing(null); await load(); onUpdated?.();
      window.dispatchEvent(new CustomEvent("tapaway:profile-locations-updated", { detail: { profileId } }));
      toast.success("Location saved");
    } catch { toast.error("Couldn't save this location. Please try again."); }
    finally { setSaving(false); }
  };

  const setActive = async (location: ProfileLocation, isActive: boolean) => {
    setBusyId(location.id);
    try {
      const { error: updateError } = await (supabase.from("profile_locations" as any) as any)
        .update({ is_active: isActive }).eq("id", location.id).eq("profile_id", profileId).select("id").single();
      if (updateError) throw updateError;
      await load(); onUpdated?.();
      window.dispatchEvent(new CustomEvent("tapaway:profile-locations-updated", { detail: { profileId } }));
      toast.success(isActive ? "Location restored" : "Location archived. Subscriber history is retained.");
    } catch { toast.error("Couldn't update the location. Please try again."); }
    finally { setBusyId(null); }
  };

  const downloadQr = async () => {
    if (!qr) return;
    setDownloading(true);
    try {
      const QR = await import("qrcode");
      const url = await QR.toDataURL(qr.url, { width: 1200, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
      const link = document.createElement("a");
      link.download = `${username}-${qr.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
      link.href = url; link.click();
    } catch { toast.error("Couldn't create the QR image. Please try again."); }
    finally { setDownloading(false); }
  };

  const linkActions = (name: string, url: string) => <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" className="min-h-10" onClick={() => void copy(url)}><Copy className="mr-2 h-4 w-4" />Copy link</Button>
    <Button variant="outline" size="sm" className="min-h-10" onClick={() => setQr({ name, url })}><QrCode className="mr-2 h-4 w-4" />QR code</Button>
    <Button variant="ghost" size="sm" className="min-h-10" asChild><a href={url} target="_blank" rel="noopener noreferrer">Open<ArrowUpRight className="ml-1 h-4 w-4" /></a></Button>
  </div>;

  return <div className="space-y-5">
    <Card className="p-4 sm:p-5 space-y-3">
      <div><h2 className="font-semibold text-lg">Your main hub</h2><p className="text-sm text-muted-foreground">One portable card for your whole business. Customers can choose a location, order meals, and find your socials.</p></div>
      <p className="break-all text-sm font-medium select-all">{profileLocationUrl(username)}</p>
      {linkActions("main-hub", profileLocationUrl(username))}
    </Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Fridge locations</h2><p className="text-sm text-muted-foreground">Manage every location here. Each fridge gets its own link.</p></div>
      <Button className="min-h-11" onClick={() => edit()}><Plus className="mr-2 h-4 w-4" />Add location</Button>
    </div>
    {error && <div className="rounded-lg border p-4 space-y-2" role="alert"><p className="text-sm">{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></div>}
    {loading && <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading locations…</div>}
    {!loading && !error && active.length === 0 && <Card className="p-5 text-sm text-muted-foreground">Add your first location to create a fridge link. Your main hub stays the same as you grow.</Card>}
    {active.map(location => <Card key={location.id} className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        {location.image_url ? <img src={location.image_url} alt="" loading="lazy" className="h-16 w-16 rounded-xl object-cover shrink-0" /> : <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center shrink-0"><MapPin className="h-6 w-6 text-muted-foreground" /></div>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold break-words">{location.name}</h3>{location.is_placeholder && <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">Placeholder</span>}</div><p className="mt-1 text-sm text-muted-foreground break-words">{location.address || "Add the store address when ready"}</p>{location.subtitle && <p className="mt-1 text-xs text-muted-foreground">{location.subtitle}</p>}</div>
      </div>
      {location.is_placeholder && <p className="text-xs text-muted-foreground">Ready to customize. Restock signups become available after this is set as a real location.</p>}
      <p className="text-xs text-muted-foreground break-all select-all">{profileLocationUrl(username, location.id)}</p>
      {linkActions(location.name, profileLocationUrl(username, location.id))}
      <div className="flex flex-wrap gap-2 border-t pt-3"><Button variant="outline" size="sm" className="min-h-10" onClick={() => edit(location)}><Pencil className="mr-2 h-4 w-4" />Edit location</Button><Button variant="ghost" size="sm" className="min-h-10" disabled={busyId === location.id} onClick={() => void setActive(location, false)}>{busyId === location.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}Archive</Button></div>
    </Card>)}
    {archived.length > 0 && <div className="space-y-3"><Button variant="ghost" onClick={() => setShowArchived(value => !value)}>{showArchived ? "Hide" : "Show"} archived locations ({archived.length})</Button>{showArchived && archived.map(location => <Card key={location.id} className="p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{location.name}</p><p className="text-xs text-muted-foreground">Hidden from the hub and new restock signups</p></div><Button variant="outline" disabled={busyId === location.id} onClick={() => void setActive(location, true)}><RotateCcw className="mr-2 h-4 w-4" />Restore</Button></Card>)}</div>}
    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%_-_2rem)] sm:max-w-lg"><DialogHeader><DialogTitle>{editing === "new" ? "Add a fridge location" : "Edit location"}</DialogTitle><DialogDescription>The location keeps the same card link when you update its details.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="location-name">Store or location name</Label><Input id="location-name" value={draft.name} onChange={event => patch({ name: event.target.value })} maxLength={120} placeholder="Store name" required /></div>
        <div className="space-y-2"><Label htmlFor="location-address">Store address</Label><Input id="location-address" value={draft.address || ""} onChange={event => patch({ address: event.target.value })} maxLength={300} placeholder="Street, city, state" /></div>
        <div className="space-y-2"><Label htmlFor="location-subtitle">Short description</Label><Input id="location-subtitle" value={draft.subtitle || ""} onChange={event => patch({ subtitle: event.target.value })} maxLength={160} placeholder="Find our fridge near the checkout" /></div>
        <div className="space-y-2"><Label htmlFor="location-directions">Directions link (optional)</Label><Input id="location-directions" type="url" value={draft.directions_url || ""} onChange={event => patch({ directions_url: event.target.value })} maxLength={2000} placeholder="https://maps.google.com/…" /></div>
        <div className="space-y-2"><Label htmlFor="location-image">Location image URL (optional)</Label><Input id="location-image" type="text" inputMode="url" value={draft.image_url || ""} onChange={event => patch({ image_url: event.target.value })} maxLength={2000} placeholder="https://…" /><p className="text-xs text-muted-foreground">Leave blank to use the location placeholder.</p></div>
        <div className="space-y-2"><Label htmlFor="location-note">Restock note (optional)</Label><Textarea id="location-note" value={draft.restock_note || ""} onChange={event => patch({ restock_note: event.target.value })} maxLength={240} placeholder="For example: New meals arrive weekly" rows={2} /></div>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={draft.is_placeholder} onChange={event => patch({ is_placeholder: event.target.checked })} /><span>This is a placeholder location<span className="block mt-1 text-xs text-muted-foreground">Uncheck after adding the real store name and address.</span></span></label>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save location</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!qr} onOpenChange={open => { if (!open) setQr(null); }}><DialogContent className="w-[calc(100%_-_2rem)] sm:max-w-sm"><DialogHeader><DialogTitle>{qr?.name === "main-hub" ? "Main hub QR code" : "Fridge QR code"}</DialogTitle><DialogDescription>{qr?.name === "main-hub" ? "Use this on the portable card for all locations." : qr?.name}</DialogDescription></DialogHeader>{qr && <><div className="mx-auto rounded-xl bg-white p-5"><QRCode value={qr.url} size={192} className="h-auto max-w-full" /></div><p className="break-all text-center text-xs text-muted-foreground select-all">{qr.url}</p><Button disabled={downloading} onClick={() => void downloadQr()}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download QR image</Button></>}</DialogContent></Dialog>
  </div>;
}
