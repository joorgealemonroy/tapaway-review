import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, ShieldOff } from "lucide-react";

interface AbuseFlag {
  id: string;
  referral_id: string;
  flag_type: string;
  details: string | null;
  resolved: boolean;
  created_at: string;
  // Joined
  affiliate_name: string;
  affiliate_id: string;
  referred_username: string;
}

export const AffiliateAbuseFlags = () => {
  const [flags, setFlags] = useState<AbuseFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data: flagData } = await supabase
        .from("affiliate_abuse_flags")
        .select("*")
        .order("created_at", { ascending: false });

      if (!flagData || flagData.length === 0) {
        setFlags([]);
        setLoading(false);
        return;
      }

      // Get referral details
      const referralIds = [...new Set(flagData.map(f => f.referral_id))];
      const { data: referrals } = await supabase
        .from("affiliate_referrals")
        .select("id, affiliate_id, referred_profile_id")
        .in("id", referralIds);

      const refMap = Object.fromEntries((referrals || []).map(r => [r.id, r]));

      // Get affiliate names
      const affiliateIds = [...new Set((referrals || []).map(r => r.affiliate_id))];
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("id, user_id")
        .in("id", affiliateIds);

      const userIds = (affiliates || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("personal_profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileByUser = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const affUserMap = Object.fromEntries((affiliates || []).map(a => [a.id, a.user_id]));

      // Get referred profile usernames
      const profileIds = [...new Set((referrals || []).map(r => r.referred_profile_id).filter(Boolean))];
      let profileByIdMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: refProfiles } = await supabase
          .from("personal_profiles")
          .select("id, username")
          .in("id", profileIds);
        profileByIdMap = Object.fromEntries((refProfiles || []).map(p => [p.id, p.username]));
      }

      setFlags(flagData.map(f => {
        const ref = refMap[f.referral_id];
        return {
          ...f,
          affiliate_id: ref?.affiliate_id || "",
          affiliate_name: ref ? (profileByUser[affUserMap[ref.affiliate_id]]?.full_name || "Unknown") : "Unknown",
          referred_username: ref?.referred_profile_id ? (profileByIdMap[ref.referred_profile_id] || "—") : "—",
        };
      }));
    } catch (err) {
      console.error("Error loading flags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFlags(); }, []);

  const resolveFlag = async (flagId: string) => {
    setActing(flagId);
    try {
      const { error } = await supabase
        .from("affiliate_abuse_flags")
        .update({ resolved: true })
        .eq("id", flagId);
      if (error) throw error;
      toast.success("Flag resolved");
      loadFlags();
    } catch {
      toast.error("Failed to resolve flag");
    } finally {
      setActing(null);
    }
  };

  const deactivateAffiliate = async (affiliateId: string) => {
    setActing(affiliateId);
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ is_active: false })
        .eq("id", affiliateId);
      if (error) throw error;
      toast.success("Affiliate deactivated");
      loadFlags();
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setActing(null);
    }
  };

  const unresolvedCount = flags.filter(f => !f.resolved).length;
  const displayed = showResolved ? flags : flags.filter(f => !f.resolved);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unresolvedCount} unresolved flags</p>
        <Button variant="ghost" size="sm" onClick={() => setShowResolved(!showResolved)}>
          {showResolved ? "Hide Resolved" : "Show All"}
        </Button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No abuse flags found.</div>
      ) : (
        <div className="space-y-2">
          {displayed.map(flag => (
            <div key={flag.id} className={`p-4 bg-card rounded-xl border ${flag.resolved ? "border-border opacity-60" : "border-destructive/30"}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${flag.resolved ? "text-muted-foreground" : "text-destructive"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      {flag.flag_type.replace("_", " ")}
                    </span>
                    {flag.resolved && (
                      <span className="text-xs text-muted-foreground">Resolved</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">
                    Affiliate: {flag.affiliate_name} · Referral: @{flag.referred_username}
                  </p>
                  {flag.details && (
                    <p className="text-xs text-muted-foreground mt-1">{flag.details}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(flag.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!flag.resolved && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveFlag(flag.id)}
                      disabled={acting === flag.id}
                    >
                      {acting === flag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deactivateAffiliate(flag.affiliate_id)}
                      disabled={acting === flag.affiliate_id}
                    >
                      {acting === flag.affiliate_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
