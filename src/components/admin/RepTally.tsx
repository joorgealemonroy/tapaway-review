// RepTally — human-readable "$5/demo what do I owe" readout for Jorge.
// Earned = demos created that month (created_by_rep_id) × $5.
// Paid = sum of rep_payments rows for the rep. Owed = earned − paid.
//
// IMPORTANT: this is not the commission system. The actual $5 payout rows
// in the `commissions` table are written by the `award-demo-commission`
// edge function at approval time. This tally deliberately counts DEMOS
// CREATED (pre-approval), so it can differ from awarded commissions —
// see the "Why might earned and awarded differ?" note in the doc block
// and in FULFILLMENT-PIPELINE.md.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Plus, Trash2 } from "lucide-react";

export const DEMO_RATE = 5;

type Rep = { id: string; name: string; email: string; is_active: boolean };

type RepPayment = {
  id: string;
  sales_rep_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
};

type TallyRow = {
  rep: Rep;
  demos: number;
  earned: number;
  paid: number;
  owed: number;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthRange = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
};

const MONTHS: { key: string; label: string }[] = (() => {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({ key, label: d.toLocaleString(undefined, { month: "long", year: "numeric" }) });
  }
  return out;
})();

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function RepTally({ compact = false }: { compact?: boolean }) {
  const [reps, setReps] = useState<Rep[]>([]);
  const [payments, setPayments] = useState<RepPayment[]>([]);
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(MONTHS[0].key);

  // payment form
  const [payRep, setPayRep] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = monthRange(month);
      const [repsRes, payRes, demoRes] = await Promise.all([
        supabase.from("sales_reps").select("id, name, email, is_active").order("name"),
        supabase.from("rep_payments").select("id, sales_rep_id, amount, paid_at, note, created_at").order("paid_at", { ascending: false }),
        supabase
          .from("personal_profiles")
          .select("created_by_rep_id")
          .not("created_by_rep_id", "is", null)
          .gte("created_at", start)
          .lt("created_at", end),
      ]);
      if (repsRes.error) throw repsRes.error;
      if (payRes.error) throw payRes.error;
      if (demoRes.error) throw demoRes.error;

      setReps((repsRes.data ?? []) as Rep[]);
      setPayments((payRes.data ?? []) as RepPayment[]);

      const counts: Record<string, number> = {};
      for (const r of (demoRes.data ?? []) as { created_by_rep_id: string | null }[]) {
        if (!r.created_by_rep_id) continue;
        counts[r.created_by_rep_id] = (counts[r.created_by_rep_id] ?? 0) + 1;
      }
      setDemoCounts(counts);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load rep tally: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: TallyRow[] = useMemo(
    () =>
      reps.map((rep) => {
        const demos = demoCounts[rep.id] ?? 0;
        const earned = demos * DEMO_RATE;
        const paid = payments
          .filter((p) => p.sales_rep_id === rep.id)
          .reduce((s, p) => s + Number(p.amount), 0);
        return { rep, demos, earned, paid, owed: earned - paid };
      }),
    [reps, payments, demoCounts]
  );

  const totals = useMemo(
    () => ({
      demos: rows.reduce((s, r) => s + r.demos, 0),
      earned: rows.reduce((s, r) => s + r.earned, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      owed: rows.reduce((s, r) => s + r.owed, 0),
    }),
    [rows]
  );

  const recentPayments = useMemo(() => payments.slice(0, 10), [payments]);

  const deletePayment = async (p: RepPayment) => {
    const repName = reps.find((r) => r.id === p.sales_rep_id)?.name ?? "rep";
    if (
      !window.confirm(
        `Delete the $${Number(p.amount).toFixed(2)} payment to ${repName} (${new Date(p.paid_at).toLocaleDateString()})?\n\nThe balance will be recalculated.`
      )
    )
      return;
    try {
      const { error } = await supabase.from("rep_payments").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("Payment deleted.");
      await load();
    } catch (e) {
      toast.error("Could not delete payment: " + (e instanceof Error ? e.message : "unknown"));
    }
  };

  const logPayment = async () => {
    const amount = Number(payAmount);
    if (!payRep) return toast.error("Pick a rep first.");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount.");
    if (!payDate) return toast.error("Pick a date.");
    const repName = reps.find((r) => r.id === payRep)?.name ?? "rep";
    if (!window.confirm(`Log a $${amount.toFixed(2)} payment to ${repName}?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("rep_payments").insert({
        sales_rep_id: payRep,
        amount,
        paid_at: new Date(payDate + "T12:00:00").toISOString(),
        note: payNote.trim() || null,
      });
      if (error) throw error;
      toast.success("Payment logged.");
      setPayAmount("");
      setPayNote("");
      setPayRep("");
      await load();
    } catch (e) {
      toast.error("Could not log payment: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Rep payout tally
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            $5 per demo created · what you've paid comes off the balance.
          </p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 rounded-lg border border-white/10 bg-[#0a0e1a] px-2 text-sm text-white/80"
        >
          {MONTHS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-white/40 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tally…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[11px] text-white/40">Demos made</div>
              <div className="text-xl font-semibold text-white tabular-nums">{totals.demos}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[11px] text-white/40">Earned (demos × $5)</div>
              <div className="text-xl font-semibold text-white tabular-nums">{fmtMoney(totals.earned)}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[11px] text-white/40">Paid out</div>
              <div className="text-xl font-semibold text-white tabular-nums">{fmtMoney(totals.paid)}</div>
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-3">
              <div className="text-[11px] text-white/40">Owed now</div>
              <div
                className={`text-xl font-semibold tabular-nums ${totals.owed > 0 ? "text-primary" : "text-emerald-400"}`}
              >
                {fmtMoney(totals.owed)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map(({ rep, demos, earned, paid, owed }) => (
              <div
                key={rep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {rep.name}
                    {!rep.is_active && <span className="ml-2 text-[11px] text-white/40">(inactive)</span>}
                  </div>
                  <div className="text-xs text-white/40">{demos} demo{demos === 1 ? "" : "s"} this month</div>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <div className="text-white/70">
                    {fmtMoney(earned)} <span className="text-white/30">− {fmtMoney(paid)} paid</span>
                  </div>
                  <div className={`font-semibold ${owed > 0 ? "text-primary" : "text-emerald-400"}`}>
                    {fmtMoney(owed)} owed
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-sm text-white/40 py-4 text-center">No sales reps yet.</div>
            )}
          </div>

          {!compact && (
            <>
              <div className="mt-5 border-t border-white/5 pt-4">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Log a payment
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs text-white/50">Rep</Label>
                    <select
                      value={payRep}
                      onChange={(e) => setPayRep(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 text-sm text-white/80"
                    >
                      <option value="">Select rep…</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">Amount ($)</Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder="100.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">Date paid</Label>
                    <Input
                      className="mt-1"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">Note</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Venmo 9/20"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="mt-3 w-full sm:w-auto min-h-[44px]"
                  onClick={() => void logPayment()}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Log payment
                </Button>
              </div>

              {recentPayments.length > 0 && (
                <div className="mt-5 border-t border-white/5 pt-4">
                  <h4 className="text-sm font-medium text-white mb-2">Recent payments</h4>
                  <div className="space-y-1.5">
                    {recentPayments.map((p) => {
                      const rep = reps.find((r) => r.id === p.sales_rep_id);
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="text-white/70 min-w-0">
                            {rep?.name ?? "Unknown rep"}
                            <span className="text-white/30 text-xs ml-2">
                              {new Date(p.paid_at).toLocaleDateString()}
                              {p.note ? ` · ${p.note}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="text-white tabular-nums mr-1">{fmtMoney(Number(p.amount))}</div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => void deletePayment(p)}
                              aria-label={`Delete $${Number(p.amount).toFixed(2)} payment to ${rep?.name ?? "rep"}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <p className="text-[11px] text-white/30 mt-4 leading-relaxed">
        Reconciling with commissions: the $5 rows in the commissions table are written by
        award-demo-commission <em>when a demo is approved</em>. This tally counts demos
        created, so it runs ahead of commissions (unapproved demos) and can differ when a
        bonus was locked by the quality gate or voided by the daily cap.
      </p>
    </div>
  );
}
