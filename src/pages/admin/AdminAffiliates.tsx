import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffiliateList, type AffiliateRow } from "@/components/admin/affiliate/AffiliateList";
import { AffiliatePayouts } from "@/components/admin/affiliate/AffiliatePayouts";
import { AffiliateSettings } from "@/components/admin/affiliate/AffiliateSettings";
import { AffiliateAbuseFlags } from "@/components/admin/affiliate/AffiliateAbuseFlags";

const AdminAffiliates = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadAffiliates();
    loadUnresolvedCount();
  }, [isAdmin, adminLoading]);

  const loadUnresolvedCount = async () => {
    const { count } = await supabase
      .from("affiliate_abuse_flags")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false);
    setUnresolvedCount(count || 0);
  };

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const { data: affData, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!affData) { setAffiliates([]); return; }

      const userIds = affData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("personal_profiles")
        .select("user_id, full_name, email, username")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

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

      <Tabs defaultValue="affiliates">
        <TabsList>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="abuse" className="relative">
            Abuse Flags
            {unresolvedCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                {unresolvedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates" className="space-y-4 mt-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <AffiliateList
              affiliates={affiliates}
              search={search}
              onSearchChange={setSearch}
              onReload={loadAffiliates}
            />
          )}
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <AffiliatePayouts />
        </TabsContent>

        <TabsContent value="abuse" className="mt-4">
          <AffiliateAbuseFlags />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <AffiliateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAffiliates;
