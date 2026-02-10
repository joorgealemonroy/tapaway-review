import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, DollarSign, CheckCircle2 } from "lucide-react";

interface PayoutRow {
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  pending_total: number;
  pending_count: number;
}

export const AffiliatePayouts = () => {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      // Get all pending commissions grouped by affiliate
      const { data: commissions } = await supabase
        .from("affiliate_commissions")
        .select("affiliate_id, amount")
        .eq("status", "pending");

      if (!commissions || commissions.length === 0) {
        setPayouts([]);
        setLoading(false);
        return;
      }

      // Group by affiliate
      const grouped: Record<string, { total: number; count: number }> = {};
      commissions.forEach(c => {
        if (!grouped[c.affiliate_id]) grouped[c.affiliate_id] = { total: 0, count: 0 };
        grouped[c.affiliate_id].total += Number(c.amount);
        grouped[c.affiliate_id].count += 1;
      });

      // Get affiliate details
      const affiliateIds = Object.keys(grouped);
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("id, user_id")
        .in("id", affiliateIds);

      const userIds = (affiliates || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from("personal_profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const affUserMap = Object.fromEntries((affiliates || []).map(a => [a.id, a.user_id]));

      // Get payout minimum
      const { data: settings } = await supabase
        .from("affiliate_settings")
        .select("payout_minimum")
        .limit(1)
        .single();

      const payoutMin = settings?.payout_minimum ?? 20;

      const rows: PayoutRow[] = affiliateIds
        .filter(id => grouped[id].total >= payoutMin)
        .map(id => ({
          affiliate_id: id,
          affiliate_name: profileMap[affUserMap[id]]?.full_name || "Unknown",
          affiliate_email: profileMap[affUserMap[id]]?.email || "",
          pending_total: grouped[id].total,
          pending_count: grouped[id].count,
        }))
        .sort((a, b) => b.pending_total - a.pending_total);

      setPayouts(rows);
    } catch (err) {
      console.error("Error loading payouts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayouts(); }, []);

  const markPaid = async (affiliateId: string) => {
    setPaying(affiliateId);
    try {
      const { error } = await supabase
        .from("affiliate_commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("affiliate_id", affiliateId)
        .eq("status", "pending");

      if (error) throw error;
      toast.success("Commissions marked as paid");
      loadPayouts();
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (payouts.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No pending payouts above minimum threshold.</div>;
  }

  return (
    <div className="space-y-2">
      {payouts.map(p => (
        <div key={p.affiliate_id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{p.affiliate_name}</p>
            <p className="text-sm text-muted-foreground">{p.affiliate_email}</p>
            <p className="text-xs text-muted-foreground">
              {p.pending_count} pending commissions · ${p.pending_total.toFixed(2)}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => markPaid(p.affiliate_id)}
            disabled={paying === p.affiliate_id}
          >
            {paying === p.affiliate_id ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            Mark Paid
          </Button>
        </div>
      ))}
    </div>
  );
};
