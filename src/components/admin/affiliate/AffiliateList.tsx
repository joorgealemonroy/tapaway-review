import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Shield, ShieldOff, Settings, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface AffiliateRow {
  id: string;
  user_id: string;
  referral_code: string;
  max_invites: number | null;
  is_active: boolean;
  created_at: string;
  referral_count: number;
  full_name: string;
  email: string;
  username: string;
}

interface Props {
  affiliates: AffiliateRow[];
  search: string;
  onSearchChange: (s: string) => void;
  onReload: () => void;
}

export const AffiliateList = ({ affiliates, search, onSearchChange, onReload }: Props) => {
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateRow | null>(null);
  const [editMaxInvites, setEditMaxInvites] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = affiliates.filter(a => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return a.full_name.toLowerCase().includes(s) ||
      a.email.toLowerCase().includes(s) ||
      a.referral_code.toLowerCase().includes(s);
  });

  const toggleActive = async (affiliate: AffiliateRow) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ is_active: !affiliate.is_active })
        .eq("id", affiliate.id);
      if (error) throw error;
      toast.success(affiliate.is_active ? "Affiliate deactivated" : "Affiliate activated");
      onReload();
    } catch {
      toast.error("Failed to update affiliate");
    }
  };

  const saveCapEdit = async () => {
    if (!editingAffiliate) return;
    setSaving(true);
    try {
      const maxInvites = editMaxInvites.trim() === "" ? null : parseInt(editMaxInvites);
      const { error } = await supabase
        .from("affiliates")
        .update({ max_invites: maxInvites })
        .eq("id", editingAffiliate.id);
      if (error) throw error;
      toast.success("Invite cap updated");
      setEditingAffiliate(null);
      onReload();
    } catch {
      toast.error("Failed to update cap");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search affiliates..." value={search} onChange={e => onSearchChange(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No affiliates match" : "No affiliates yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(aff => (
            <div key={aff.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{aff.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    aff.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {aff.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">@{aff.username} · {aff.email}</p>
                <p className="text-xs text-muted-foreground">
                  {aff.referral_count} referrals · Cap: {aff.max_invites ?? "Unlimited"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setEditingAffiliate(aff);
                  setEditMaxInvites(aff.max_invites?.toString() || "");
                }}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant={aff.is_active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleActive(aff)}
                >
                  {aff.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editingAffiliate} onOpenChange={open => !open && setEditingAffiliate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Invite Cap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Max Invites (leave empty for unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={editMaxInvites}
                onChange={e => setEditMaxInvites(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <Button onClick={saveCapEdit} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
