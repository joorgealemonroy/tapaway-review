import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Lock } from "lucide-react";

export interface EditHubTarget {
  id: string;
  full_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  print_notes?: string | null;
  is_approved?: boolean | null;
}

interface LinkRow {
  id: string;
  title: string | null;
  url: string | null;
}

interface Props {
  target: EditHubTarget | null;
  onClose: () => void;
  onSaved?: () => void;
}

const EditHubDrawer = ({ target, onClose, onSaved }: Props) => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [saving, setSaving] = useState(false);

  const usernameLocked = target?.is_approved === true;

  useEffect(() => {
    if (!target) return;
    setFullName(target.full_name ?? "");
    setUsername(target.username ?? "");
    setPhotoUrl(target.profile_photo_url ?? "");
    setNotes(target.print_notes ?? "");
    setLinks([]);

    let cancelled = false;
    const loadLinks = async () => {
      setLoadingLinks(true);
      const { data, error } = await supabase
        .from("personal_links")
        .select("id, title, url")
        .eq("profile_id", target.id)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load hub links", error);
      } else {
        setLinks((data ?? []) as LinkRow[]);
      }
      setLoadingLinks(false);
    };
    loadLinks();
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  const updateLink = (id: string, patch: Partial<LinkRow>) =>
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLink = async (id: string) => {
    const { error } = await supabase.from("personal_links").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove link: " + error.message);
      return;
    }
    setLinks((ls) => ls.filter((l) => l.id !== id));
    toast.success("Link removed");
  };

  const addLink = async () => {
    const { data, error } = await supabase
      .from("personal_links")
      .insert({
        profile_id: target.id,
        title: "New link",
        url: "https://",
        sort_order: links.length,
      })
      .select("id, title, url")
      .single();
    if (error || !data) {
      toast.error("Could not add link: " + (error?.message ?? "unknown"));
      return;
    }
    setLinks((ls) => [...ls, data as LinkRow]);
  };

  const save = async () => {
    if (!fullName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSaving(true);
    try {
      const profilePatch: Record<string, unknown> = {
        full_name: fullName.trim(),
        profile_photo_url: photoUrl.trim() || null,
        print_notes: notes.trim() || null,
      };
      if (!usernameLocked && username.trim()) {
        profilePatch.username = username.trim().replace(/^@/, "").toLowerCase();
      }

      const { error } = await supabase
        .from("personal_profiles")
        .update(profilePatch)
        .eq("id", target.id);
      if (error) throw error;

      await Promise.all(
        links.map((l) =>
          supabase
            .from("personal_links")
            .update({ title: l.title ?? "", url: l.url ?? "" })
            .eq("id", l.id)
        )
      );

      toast.success("Hub updated");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Save failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto bg-[#0a0e1a] border-white/10 text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Edit hub</SheetTitle>
          <SheetDescription className="text-white/50">
            Update details without changing the print status.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-widest text-white/40">
              Business name
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              className="bg-white/[0.03] border-white/10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              Handle {usernameLocked && <Lock className="h-3 w-3 text-amber-300" />}
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={saving || usernameLocked}
              className="bg-white/[0.03] border-white/10 font-mono"
            />
            {usernameLocked && (
              <p className="text-[11px] text-amber-300/70">
                Locked — this hub is approved and its link is already in circulation.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-widest text-white/40">
              Logo / photo URL
            </Label>
            <div className="flex items-center gap-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/10"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
              )}
              <Input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                disabled={saving}
                className="bg-white/[0.03] border-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-widest text-white/40">
                Links
              </Label>
              <Button
                onClick={addLink}
                size="sm"
                variant="ghost"
                disabled={saving}
                className="h-7 px-2 text-[11px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {loadingLinks ? (
              <div className="flex items-center gap-2 text-xs text-white/40 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading links…
              </div>
            ) : links.length === 0 ? (
              <p className="text-xs text-white/30 py-1">No links yet.</p>
            ) : (
              <div className="space-y-2">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <Input
                      value={l.title ?? ""}
                      onChange={(e) => updateLink(l.id, { title: e.target.value })}
                      placeholder="Label"
                      disabled={saving}
                      className="h-8 text-xs bg-white/[0.03] border-white/10 w-1/3"
                    />
                    <Input
                      value={l.url ?? ""}
                      onChange={(e) => updateLink(l.id, { url: e.target.value })}
                      placeholder="https://"
                      disabled={saving}
                      className="h-8 text-xs bg-white/[0.03] border-white/10 flex-1"
                    />
                    <Button
                      onClick={() => removeLink(l.id)}
                      size="icon"
                      variant="ghost"
                      disabled={saving}
                      className="h-8 w-8 shrink-0 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-widest text-white/40">
              Admin / print notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={400}
              disabled={saving}
              className="bg-white/[0.03] border-white/10"
            />
          </div>

          <div className="flex justify-end gap-2 pb-6">
            <Button variant="ghost" onClick={onClose} disabled={saving} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditHubDrawer;
