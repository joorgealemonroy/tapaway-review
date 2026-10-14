import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Button } from "@/components/ui/button";
import { callFunction } from "@/lib/paymentFirst";

const STATUSES = ["purchase_complete", "business_identified", "needs_business_research", "logo_received", "logo_needed", "links_being_prepared", "hub_ready", "cards_ready_to_print", "cards_printed", "ready_to_ship", "shipped"];

type Row = {
  id: string; email: string | null; plan: string; billing_interval: string; card_quantity: number; status: string; review_reason: string | null;
  stripe_customer_id: string | null; stripe_subscription_id: string | null; created_at: string;
  onboarding_sessions: { id: string; setup_status: string; business_name: string | null; google_place_id: string | null; logo_url: string | null; logo_skipped: boolean; step: string }[];
  card_club_memberships: { id: string; status: string; enrollment_date: string | null; declined_at: string | null; card_club_paid_at: string | null; last_redemption_at: string | null; total_redemptions: number; replacement_interval_days: number; review_reason: string | null }[];
};

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function AdminNewOrders() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("checkout_intents")
      .select("id,email,plan,billing_interval,card_quantity,status,review_reason,stripe_customer_id,stripe_subscription_id,created_at,onboarding_sessions(id,setup_status,business_name,google_place_id,logo_url,logo_skipped,step),card_club_memberships(id,status,enrollment_date,declined_at,card_club_paid_at,last_redemption_at,total_redemptions,replacement_interval_days,review_reason)")
      .neq("status", "created").neq("status", "checkout_started").order("created_at", { ascending: false }).limit(200);
    setRows((data as unknown as Row[]) ?? []);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  if (loading || !isAdmin) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const setStatus = async (sessionId: string, status: string) => { setBusy(true); await supabase.rpc("admin_set_setup_status", { _session_id: sessionId, _status: status }); await load(); setBusy(false); };
  const retry = async (membershipId: string) => {
    setBusy(true);
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    await callFunction("payment-first-admin", { action: "retry_card_club", membershipId }, t);
    await load(); setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <h1 className="text-2xl font-bold">New orders (payment-first)</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cards enter the print queue only when you set Cards ready to print.</p>
      <div className="mt-6 space-y-4">
        {rows.map((r) => {
          const s = r.onboarding_sessions[0]; const m = r.card_club_memberships[0];
          const next = m?.card_club_paid_at ? new Date(new Date(m.last_redemption_at ?? m.card_club_paid_at).getTime() + m.replacement_interval_days * 864e5).toISOString() : null;
          return (
            <div key={r.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{s?.business_name || "Business not identified yet"} · {r.email}</p>
                <p className="text-muted-foreground">{day(r.created_at)} · {r.card_quantity} cards · {r.billing_interval === "year" ? "Yearly" : "Monthly"} · {r.status}</p>
              </div>
              {r.review_reason && <p className="mt-1 text-destructive">Review: {r.review_reason}</p>}
              <div className="mt-2 grid gap-1 text-muted-foreground md:grid-cols-2">
                <p>Stripe customer: {r.stripe_customer_id ?? "—"}</p><p>Subscription: {r.stripe_subscription_id ?? "—"}</p>
                <p>Place ID: {s?.google_place_id ?? (s?.step === "business" ? "waiting on customer" : "needs research")}</p>
                <p>Logo: {s?.logo_url ? <a className="underline" href={s.logo_url} target="_blank" rel="noreferrer">received</a> : s?.logo_skipped ? "find it for them" : "—"}</p>
                <p>Card Club: {m ? `${m.status}${m.declined_at ? ` (declined ${day(m.declined_at)})` : ""}` : "—"}{m?.enrollment_date ? ` · joined ${day(m.enrollment_date)}` : ""}</p>
                <p>Last replacement: {day(m?.last_redemption_at ?? null)} · Next eligible: {day(next)} · Total: {m?.total_redemptions ?? 0}</p>
                {m?.review_reason && <p className="text-destructive md:col-span-2">Card Club issue: {m.review_reason}</p>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s && (
                  <select aria-label="Setup status" className="h-9 rounded-md border border-border bg-background px-2" value={s.setup_status} disabled={busy} onChange={(e) => setStatus(s.id, e.target.value)}>
                    {STATUSES.map((x) => <option key={x} value={x}>{x.split("_").join(" ")}</option>)}
                  </select>
                )}
                {m?.status === "activation_failed" && <Button size="sm" disabled={busy} onClick={() => retry(m.id)}>Retry Card Club setup</Button>}
              </div>
            </div>
          );
        })}
        {!rows.length && <p className="text-muted-foreground">No paid orders yet.</p>}
      </div>
    </div>
  );
}
