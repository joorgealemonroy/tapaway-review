import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Search,
  Users,
  Shield,
  ShieldOff,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AffiliateRow {
  id: string;
  user_id: string;
  referral_code: string;
  max_invites: number | null;
  is_active: boolean;
  created_at: string;
  referral_count: number;
  // joined from personal_profiles
  full_name: string;
  email: string;
  username: string;
}

const AdminAffiliates = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateRow | null>(null);
  const [editMaxInvites, setEditMaxInvites] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadAffiliates();
  }, [isAdmin, adminLoading]);

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      // Get all affiliates
      const { data: affData, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!affData) { setAffiliates([]); return; }

      // Get user profiles for each affiliate
      const userIds = affData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("personal_profiles")
        .select("user_id, full_name, email, username")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      // Get referral counts
      const { data: counts } = await supabase
        .from("affiliate_referrals")
        .select("affiliate_id");

      const countMap: Record<string, number> = {};
      (counts || []).forEach(c => {
        countMap[c.affiliate_id] = (countMap[c.affiliate_id] || 0) + 1;
      });

      setAffiliates(affData.map(a => ({
        ...a,
        referral_count: countMap[a.id] || 0,
        full_name: profileMap[a.user_id]?.full_name || "Unknown",
        email: profileMap[a.user_id]?.email || "",
        username: profileMap[a.user_id]?.username || a.referral_code,
      })));
    } catch (err) {
      console.error("Error loading affiliates:", err);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (affiliate: AffiliateRow) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ is_active: !affiliate.is_active })
        .eq("id", affiliate.id);

      if (error) throw error;
      toast.success(affiliate.is_active ? "Affiliate deactivated" : "Affiliate activated");
      loadAffiliates();
    } catch (err) {
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
      loadAffiliates();
    } catch (err) {
      toast.error("Failed to update cap");
    } finally {
      setSaving(false);
    }
  };

  const filtered = affiliates.filter(a => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return a.full_name.toLowerCase().includes(s) || 
      a.email.toLowerCase().includes(s) || 
      a.referral_code.toLowerCase().includes(s);
  });

  if (authLoading || adminLoading) return <div className="p-6">Loading...</div>;
  if (!isAdmin) return <div className="p-6"><h1 className="text-xl font-semibold">Access denied</h1></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Affiliate Management</h1>
          <p className="text-sm text-muted-foreground">{affiliates.length} total affiliates</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search affiliates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No affiliates match" : "No affiliates yet. Promote users from Personal Accounts."}
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

      {/* Edit cap modal */}
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
    </div>
  );
};

export default AdminAffiliates;
