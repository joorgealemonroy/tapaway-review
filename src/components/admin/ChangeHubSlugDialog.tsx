import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { supabase } from "@/integrations/supabase/client";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import type { Hub } from "@/lib/admin/workspace";
import { toast } from "sonner";

export default function ChangeHubSlugDialog({ target, onClose, onSaved }: {
  target: Hub | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { isAdmin, loading } = useAdminAccess();
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setSlug(target?.slug || ""); setError(""); }, [target]);
  const nextSlug = slug.trim().toLowerCase().replace(/^[@/]/, "");

  const save = async () => {
    if (!target || !isAdmin || busy) return;
    setError("");
    if (!/^[a-z0-9_-]{3,40}$/.test(nextSlug) || isUsernameReserved(nextSlug)) {
      setError("Choose an available URL using 3–40 letters, numbers, hyphens or underscores.");
      return;
    }
    setBusy(true);
    try {
      // The database validates ownership of the entire slug namespace and
      // atomically keeps redirects and linked NFC cards alongside this update.
      const result = target.kind === "personal"
        ? await supabase.from("personal_profiles").update({ username: nextSlug }).eq("id", target.id).select("id").single()
        : await supabase.from("restaurants").update({ custom_slug: nextSlug }).eq("id", target.id).select("id").single();
      if (result.error) throw new Error(result.error.message);
      if (target.slug) invalidateProfileCache(target.slug);
      invalidateProfileCache(nextSlug);
      toast.success(`Hub URL updated to tapaway.co/${nextSlug}`);
      onClose();
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the hub URL. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin || loading) return null;
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl bg-[#fffdf7] text-[#19382b] sm:max-w-md" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Change hub URL</DialogTitle>
          <DialogDescription>{target?.name} · Admin only</DialogDescription>
        </DialogHeader>
        <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hub-new-slug">Hub URL</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-[#5b695e]">tapaway.co/</span>
              <Input id="hub-new-slug" value={slug} onChange={event => { setSlug(event.target.value); setError(""); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={41} disabled={busy} required className="min-w-0" />
            </div>
          </div>
          <p className="text-sm text-[#5b695e]">You can change the URL even after approval. Existing links, QR codes and TapAway cards will keep working.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !nextSlug || nextSlug === target?.slug}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save URL
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
