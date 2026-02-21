import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateAccess } from "@/hooks/useAffiliateAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Users,
  UserCheck,
  Link2,
  LogOut,
  DollarSign,
  Clock,
  Info,
  TrendingUp,
  Zap,
} from "lucide-react";

interface Referral {
  id: string;
  created_at: string;
  referred_profile: {
    username: string;
    full_name: string;
    subscription_status: string | null;
    trial_ends_at: string | null;
  } | null;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface AffiliateSettingsData {
  commission_free_base: number;
  commission_free_bonus: number;
  commission_paid_base: number;
  commission_paid_bonus: number;
  bonus_threshold: number;
}

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAffiliate, affiliateInfo, loading: affLoading } = useAffiliateAccess();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [affSettings, setAffSettings] = useState<AffiliateSettingsData | null>(null);

  const loadData = useCallback(async () => {
    if (!affiliateInfo) return;
    try {
      const { data: refData } = await supabase
        .from("affiliate_referrals")
        .select("id, created_at, referred_profile_id")
        .eq("affiliate_id", affiliateInfo.id)
        .order("created_at", { ascending: false });

      if (refData) {
        const profileIds = refData.map(r => r.referred_profile_id).filter(Boolean);
        let profileMap: Record<string, any> = {};
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("personal_profiles")
            .select("id, username, full_name, subscription_status, trial_ends_at")
            .in("id", profileIds);
          if (profiles) {
            profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
          }
        }
        setReferrals(refData.map(r => ({
          id: r.id,
          created_at: r.created_at,
          referred_profile: r.referred_profile_id ? profileMap[r.referred_profile_id] || null : null,
        })));
      }

      const { data: commData } = await supabase
        .from("affiliate_commissions")
        .select("id, amount, status, paid_at, created_at")
        .eq("affiliate_id", affiliateInfo.id)
        .order("created_at", { ascending: false });

      setCommissions(commData || []);

      // Load affiliate settings for tiered display
      const { data: settingsData } = await supabase
        .from("affiliate_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsData) {
        setAffSettings({
          commission_free_base: Number((settingsData as any).commission_free_base ?? 3),
          commission_free_bonus: Number((settingsData as any).commission_free_bonus ?? 5),
          commission_paid_base: Number((settingsData as any).commission_paid_base ?? 5),
          commission_paid_bonus: Number((settingsData as any).commission_paid_bonus ?? 8),
          bonus_threshold: Number((settingsData as any).bonus_threshold ?? 25),
        });
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [affiliateInfo]);

  useEffect(() => {
    if (!affLoading && affiliateInfo) {
      loadData();
    } else if (!affLoading) {
      setLoading(false);
    }
  }, [affLoading, affiliateInfo, loadData]);

  const copyLink = async () => {
    if (!affiliateInfo) return;
    const link = `https://tapaway.co/?ref=${affiliateInfo.referral_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || affLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAffiliate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You are not an affiliate.</p>
          <Button variant="outline" onClick={() => navigate("/personal/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Compute stats
  const activeTrials = referrals.filter(r => {
    if (!r.referred_profile) return false;
    return r.referred_profile.subscription_status === "trialing" &&
      r.referred_profile.trial_ends_at &&
      new Date(r.referred_profile.trial_ends_at) > new Date();
  }).length;

  const convertedUsers = referrals.filter(r =>
    r.referred_profile?.subscription_status === "active"
  ).length;

  const expiredUsers = referrals.filter(r => {
    if (!r.referred_profile) return true;
    const status = r.referred_profile.subscription_status;
    if (status === "active") return false;
    if (status === "trialing" && r.referred_profile.trial_ends_at && new Date(r.referred_profile.trial_ends_at) > new Date()) return false;
    return true;
  }).length;

  const totalEarned = commissions.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const pendingPayout = commissions.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const potentialPayout = commissions.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);

  const remainingInvites = affiliateInfo?.max_invites
    ? Math.max(0, affiliateInfo.max_invites - referrals.length)
    : null;

  const getStatusInfo = (ref: Referral) => {
    if (!ref.referred_profile) return { label: "Unknown", className: "bg-muted text-muted-foreground", earnings: null };
    const { subscription_status, trial_ends_at } = ref.referred_profile;
    const isTrialing = subscription_status === "trialing" && trial_ends_at && new Date(trial_ends_at) > new Date();
    if (subscription_status === "active") {
      return { label: "Converted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", earnings: "Paid" };
    }
    if (isTrialing) {
      return { label: "Active Trial", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", earnings: "Pending conversion" };
    }
    return { label: "Expired", className: "bg-muted text-muted-foreground", earnings: null };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/personal/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg text-foreground">Affiliate Hub</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Referral Link */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            Your Referral Link
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono truncate">
              tapaway.co/?ref={affiliateInfo?.referral_code}
            </div>
            <Button onClick={copyLink} size="sm" variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {remainingInvites !== null ? (
            <p className="text-xs text-muted-foreground">{remainingInvites} invites remaining</p>
          ) : (
            <p className="text-xs text-muted-foreground">Unlimited invites</p>
          )}
        </div>

        {/* Commission Rules */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            How You Earn
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium text-foreground">Free signups:</span>{" "}
                ${affSettings?.commission_free_base?.toFixed(2) ?? "3.00"} each (first {affSettings?.bonus_threshold ?? 25}), then ${affSettings?.commission_free_bonus?.toFixed(2) ?? "5.00"} each
              </span>
            </li>
            <li className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium text-foreground">Paid signups:</span>{" "}
                ${affSettings?.commission_paid_base?.toFixed(2) ?? "5.00"} each (first {affSettings?.bonus_threshold ?? 25}), then ${affSettings?.commission_paid_bonus?.toFixed(2) ?? "8.00"} each
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              Commissions are paid out monthly
            </li>
          </ul>
        </div>

        {/* Earnings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-foreground">${totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-foreground">${pendingPayout.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Pending Payout</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{activeTrials}</p>
            <p className="text-xs text-muted-foreground">Active Trials</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <UserCheck className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">{convertedUsers}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">${potentialPayout.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Potential Payout</p>
          </div>
        </div>

        {/* Referrals List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Referrals</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No referrals yet. Share your link to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => {
                const status = getStatusInfo(ref);
                return (
                  <div key={ref.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">
                        {ref.referred_profile?.full_name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {ref.referred_profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{ref.referred_profile?.username || "—"} · {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                      {status.earnings && (
                        <p className="text-xs text-muted-foreground mt-0.5">{status.earnings}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Commission History */}
        {commissions.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Commission History</h2>
            <div className="space-y-2">
              {commissions.map((comm) => (
                <div key={comm.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">${Number(comm.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    comm.status === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {comm.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AffiliateDashboard;
