import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  Megaphone,
  Printer,
  RefreshCw,
  Tag,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Admin command center — short by design.
 * Money (real Stripe MRR), what needs action today, and quick actions.
 * Deep analytics live at /admin/analytics.
 */

interface PastDueItem {
  email: string;
  name: string;
  amount_due_cents: number;
  subscription_id: string;
  account_id: string | null;
  kind: "personal" | "restaurant" | null;
}

interface TrialEnding {
  profile_id: string;
  username: string;
  name: string;
  ends_at: string;
}

interface BillingSummary {
  mrr_cents: number;
  active_count: number;
  trialing_count: number;
  past_due_count: number;
  past_due: PastDueItem[];
  trials_ending: TrialEnding[];
}

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/5 bg-white/[0.02] ${className}`}>{children}</div>
);

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const inDays = (iso: string) => {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d}d`;
};

const AdminOverview = ({ onOpenAccounts }: { onOpenAccounts: () => void }) => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [unapprovedDemos, setUnapprovedDemos] = useState<number | null>(null);
  const [awaitingPrint, setAwaitingPrint] = useState<number | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-billing-summary");
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      setBilling(data as BillingSummary);
      setUpdatedAt(new Date());

      const [{ count: demos }, { count: print }] = await Promise.all([
        supabase
          .from("personal_profiles")
          .select("id", { count: "exact", head: true })
          .or("sales_rep_id.not.is.null,created_by_rep_id.not.is.null")
          .eq("is_approved", false),
        supabase
          .from("personal_profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_approved", true)
          .is("printed_at", null),
      ]);
      setUnapprovedDemos(demos ?? 0);
      setAwaitingPrint(print ?? 0);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Couldn't load billing");
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nudge = async (item: PastDueItem) => {
    if (!item.account_id || !item.kind) {
      toast.error("No TapAway account linked to this subscription");
      return;
    }
    setNudging(item.subscription_id);
    try {
      const { data, error } = await supabase.functions.invoke("send-payment-recovery", {
        body: { account_id: item.account_id, kind: item.kind },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      toast.success(`Nudge sent to ${item.name || item.email || "customer"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nudge failed");
    } finally {
      setNudging(null);
    }
  };

  const actionCount =
    (billing?.past_due.length ?? 0) +
    (billing?.trials_ending.length ?? 0) +
    (unapprovedDemos ?? 0) +
    (awaitingPrint ?? 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Command Center</h1>
          {updatedAt && (
            <p className="text-xs text-white/40">
              Updated {updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void load()}
          disabled={billingLoading}
          className="text-white/70 hover:text-white border border-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${billingLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {billingError && (
        <Panel className="p-4 border-red-500/30 bg-red-500/[0.06]">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {billingError}
          </div>
        </Panel>
      )}

      {/* Money — real Stripe numbers */}
      <div className="grid grid-cols-3 gap-3">
        <Panel className="p-4">
          <div className="text-[11px] uppercase tracking-widest text-white/40">MRR</div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {billingLoading ? (
              <span className="inline-block h-7 w-20 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              money(billing?.mrr_cents ?? 0)
            )}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">live Stripe billing</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[11px] uppercase tracking-widest text-white/40">Paying</div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {billingLoading ? (
              <span className="inline-block h-7 w-12 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              billing?.active_count ?? 0
            )}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">active subs</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-[11px] uppercase tracking-widest text-white/40">Trialing</div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {billingLoading ? (
              <span className="inline-block h-7 w-12 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              billing?.trialing_count ?? 0
            )}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">in trial</div>
        </Panel>
      </div>

      {/* Needs action */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Needs action
            {actionCount > 0 && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                {actionCount}
              </span>
            )}
          </h2>
        </div>

        {billingLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/40 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </div>
        ) : actionCount === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-300 py-2">
            <CheckCircle2 className="h-4 w-4" /> All clear. Nothing needs you right now.
          </div>
        ) : (
          <div className="space-y-2">
            {(billing?.past_due ?? []).map((p) => (
              <div
                key={p.subscription_id}
                className="flex items-center gap-3 p-3 rounded-lg bg-red-500/[0.07] border border-red-500/20"
              >
                <CreditCard className="h-4 w-4 text-red-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {p.name || p.email || "Customer"}
                  </div>
                  <div className="text-xs text-white/50">
                    Payment failed · {money(p.amount_due_cents)}/mo
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => void nudge(p)}
                  disabled={nudging === p.subscription_id}
                  className="shrink-0 min-h-[36px]"
                >
                  {nudging === p.subscription_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Nudge"
                  )}
                </Button>
              </div>
            ))}

            {(billing?.trials_ending ?? []).map((t) => (
              <button
                key={t.profile_id}
                onClick={onOpenAccounts}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-500/20 text-left"
              >
                <Clock className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{t.name}</div>
                  <div className="text-xs text-white/50">Trial ends {inDays(t.ends_at)}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
              </button>
            ))}

            {(unapprovedDemos ?? 0) > 0 && (
              <button
                onClick={() => navigate("/admin/fulfillment")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-left"
              >
                <Users className="h-4 w-4 text-white/60 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {unapprovedDemos} demo{unapprovedDemos === 1 ? "" : "s"} waiting for approval
                  </div>
                  <div className="text-xs text-white/50">Review → print → activate</div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
              </button>
            )}

            {(awaitingPrint ?? 0) > 0 && (
              <button
                onClick={() => navigate("/admin/fulfillment")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-left"
              >
                <Printer className="h-4 w-4 text-white/60 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {awaitingPrint} approved hub{awaitingPrint === 1 ? "" : "s"} not printed yet
                  </div>
                  <div className="text-xs text-white/50">Print queue</div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
              </button>
            )}
          </div>
        )}
      </Panel>

      {/* Quick actions */}
      <Panel className="p-4">
        <h2 className="font-semibold text-white mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Van sale", desc: "Close on the spot", icon: Truck, path: "/admin/van" },
            { label: "Fulfillment", desc: "Approve · print · ship", icon: Printer, path: "/admin/fulfillment" },
            { label: "Broadcast", desc: "SMS blast", icon: Megaphone, path: "/admin/emails" },
            { label: "Emails", desc: "Templates & history", icon: Mail, path: "/admin/emails" },
            { label: "Promo link", desc: "Discount pay link", icon: Tag, path: "/admin/discounts" },
            { label: "Analytics", desc: "Traffic & taps", icon: Users, path: "/admin/analytics" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.06] transition-colors min-h-[56px]"
            >
              <a.icon className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{a.label}</div>
                <div className="text-xs text-white/50 truncate">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <p className="text-center text-xs text-white/30 pb-2">
        <DollarSign className="h-3 w-3 inline mr-1" />
        MRR is live Stripe billing — never an estimate.
      </p>
    </div>
  );
};

export default AdminOverview;
