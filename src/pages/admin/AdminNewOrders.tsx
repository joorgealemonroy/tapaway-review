import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { callFunction } from "@/lib/paymentFirst";

const STATUSES = ["purchase_complete", "business_identified", "needs_business_research", "logo_received", "logo_needed", "links_being_prepared", "hub_ready", "cards_ready_to_print", "cards_printed", "ready_to_ship", "shipped"];

type Redemption = { id: string; status: string; requested_at: string; approved_at: string | null; quantity: number; design_update_note: string | null; tracking_number: string | null };
type Row = {
  id: string; business_details?: { name: string; city: string; link: string; goal: string }; email: string | null; plan: string; billing_interval: string; card_quantity: number; status: string; review_reason: string | null;
  stripe_customer_id: string | null; stripe_subscription_id: string | null; created_at: string; stripe_livemode: boolean;
  onboarding_sessions: { id: string; setup_status: string; hub_status: string; business_name: string | null; google_place_id: string | null; logo_url: string | null; logo_skipped: boolean; step: string; personal_profile_id: string | null; fulfillment_order_id: string | null; shipping_address: Record<string, string | null> | null }[];
  card_club_memberships: { id: string; status: string; declined_at: string | null; card_club_paid_at: string | null; last_approved_at: string | null; total_redemptions: number; replacement_interval_days: number; review_reason: string | null; card_club_redemptions: Redemption[] }[];
};
type Order = { id: string; status: string; tracking_number: string | null };

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function AdminNewOrders() {
  const { isAdmin, loading } = useAdminGuard();
  const [rows, setRows] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [showTest, setShowTest] = useState(false);
  const [testKey, setTestKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from("checkout_intents")
      .select("id,business_details,email,plan,billing_interval,card_quantity,status,review_reason,stripe_customer_id,stripe_subscription_id,created_at,stripe_livemode,onboarding_sessions(id,setup_status,hub_status,business_name,google_place_id,logo_url,logo_skipped,step,personal_profile_id,fulfillment_order_id,shipping_address),card_club_memberships(id,status,declined_at,card_club_paid_at,last_approved_at,total_redemptions,replacement_interval_days,review_reason,card_club_redemptions(id,status,requested_at,approved_at,quantity,design_update_note,tracking_number))")
      .not("status", "in", "(created,checkout_started)").order("created_at", { ascending: false }).limit(200);
    if (!showTest) q = q.eq("stripe_livemode", true);
    const { data } = await q;
    const list = (data as unknown as Row[]) ?? [];
    setRows(list);
    const ids = list.map((r) => r.onboarding_sessions[0]?.fulfillment_order_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: o } = await supabase.from("fulfillment_orders").select("id,status,tracking_number").in("id", ids);
      setOrders(Object.fromEntries(((o as Order[]) ?? []).map((x) => [x.id, x])));
    }
  }, [showTest]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("payment_first_config").select("test_access_key").eq("id", 1).maybeSingle().then(({ data }) => setTestKey(data?.test_access_key ?? null));
  }, [isAdmin]);
  if (loading || !isAdmin) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const run = async (fn: () => PromiseLike<unknown>) => { setBusy(true); await fn(); await load(); setBusy(false); };
  const setStatus = (sessionId: string, status: string) => run(() => supabase.rpc("admin_set_setup_status", { _session_id: sessionId, _status: status }));
  const decide = (id: string, approve: boolean) => run(() => supabase.rpc("admin_card_club_decide", { _redemption_id: id, _approve: approve, _reason: approve ? null : window.prompt("Reason for rejecting?") || "Rejected by admin" }));
  const progress = (id: string, status: string) => run(() => supabase.rpc("admin_set_redemption_progress", { _redemption_id: id, _status: status, _tracking: status === "shipped" ? window.prompt("Tracking number (optional)") || null : null }));
  const override = (id: string) => {
    const status = window.prompt("Set Card Club status (active, cancelled, past_due, pending_activation)");
    if (!status) return;
    run(() => supabase.rpc("admin_card_club_override", { _membership_id: id, _status: status, _reason: window.prompt("Reason") || "admin override" }));
  };
  const retry = (membershipId: string) => run(async () => {
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    await callFunction("payment-first-admin", { action: "retry_card_club", membershipId }, t);
  });

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">New orders (payment-first)</h1>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} /> Show TEST orders</label>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Orders enter the print queue only when set to "cards ready to print". TEST orders never enter the real queue.</p>
      {testKey && <p className="mt-1 break-all text-xs text-muted-foreground">Private test link: /onboarding?flow=payment_first&amp;pf_key={testKey}</p>}
      <div className="mt-6 space-y-4">
        {rows.map((r) => {
          const s = r.onboarding_sessions[0]; const m = r.card_club_memberships[0];
          const order = s?.fulfillment_order_id ? orders[s.fulfillment_order_id] : undefined;
          const anchor = m?.last_approved_at ?? m?.card_club_paid_at ?? null;
          const next = anchor ? new Date(new Date(anchor).getTime() + (m?.replacement_interval_days ?? 30) * 864e5).toISOString() : null;
          const a = s?.shipping_address;
          const reds = [...(m?.card_club_redemptions ?? [])].sort((x, y) => y.requested_at.localeCompare(x.requested_at));
          return (
            <div key={r.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{!r.stripe_livemode && <Badge variant="destructive" className="mr-2">TEST</Badge>}{s?.business_name || "Business not identified yet"} · {r.email}</p>
                <p className="text-muted-foreground">{day(r.created_at)} · {r.card_quantity} cards · {r.billing_interval === "year" ? "Yearly" : "Monthly"} · {r.status}</p>
              </div>
              {r.review_reason && <p className="mt-1 text-destructive">Review: {r.review_reason}</p>}
              <div className="mt-2 grid gap-1 text-muted-foreground md:grid-cols-2">
                <p>Stripe customer: {r.stripe_customer_id ?? "—"}</p><p>Subscription: {r.stripe_subscription_id ?? "—"}</p>
                {r.business_details && <><p>Business location: {r.business_details.city}</p><p>Goal: {r.business_details.goal || "—"}</p>{r.business_details.link && <p className="md:col-span-2">Find them online: <a className="underline" href={r.business_details.link} target="_blank" rel="noopener noreferrer">{r.business_details.link}</a></p>}</>}
                <p>Place ID: {s?.google_place_id ?? (s?.step === "business" ? "waiting on customer" : "needs research")}</p>
                <p>Logo: {s?.logo_url ? <a className="underline" href={s.logo_url} target="_blank" rel="noreferrer">received</a> : s?.logo_skipped ? "find it for them" : "—"}</p>
                <p>Setup: {s?.setup_status ?? "—"} · Page: {s?.hub_status ?? "—"}</p>
                <p>Print: {s?.setup_status === "cards_ready_to_print" ? "upload artwork in Print Queue" : order?.status ?? (s?.setup_status ?? "—")}</p>
                <p className="md:col-span-2">Ship to: {a ? [a.name, a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(", ") : "—"}</p>
                <p>Card Club: {m ? `${m.status}${m.declined_at ? ` (declined ${day(m.declined_at)})` : ""}` : "—"} · paid {day(m?.card_club_paid_at ?? null)}</p>
                <p>Last approved: {day(m?.last_approved_at ?? null)} · Next eligible: {m?.card_club_paid_at ? day(next) : "—"} · Total: {m?.total_redemptions ?? 0}</p>
                {m?.review_reason && <p className="text-destructive md:col-span-2">Card Club issue: {m.review_reason}</p>}
              </div>
              {reds.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {reds.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                      <span>Replacement {day(x.requested_at)} · {x.quantity} cards · {x.status}{x.design_update_note ? ` · note: ${x.design_update_note}` : ""}</span>
                      {["requested", "in_review"].includes(x.status) && <><Button size="sm" disabled={busy} onClick={() => decide(x.id, true)}>Approve</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(x.id, false)}>Reject</Button></>}
                      {x.status === "approved" && <Button size="sm" variant="outline" disabled={busy} onClick={() => progress(x.id, "printing")}>Mark printing</Button>}
                      {["approved", "printing"].includes(x.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => progress(x.id, "shipped")}>Mark shipped</Button>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s && (
                  <select aria-label="Setup status" className="h-9 rounded-md border border-border bg-background px-2" value={s.setup_status} disabled={busy} onChange={(e) => setStatus(s.id, e.target.value)}>
                    {STATUSES.map((x) => <option key={x} value={x}>{x.split("_").join(" ")}</option>)}
                  </select>
                )}
                {s && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(s.id, "hub_ready")}>Mark page ready</Button>}
                {s && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(s.id, "cards_ready_to_print")}>Artwork ready → print queue</Button>}
                {m?.status === "activation_failed" && <Button size="sm" disabled={busy} onClick={() => retry(m.id)}>Retry Card Club setup</Button>}
                {m && m.status !== "declined" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => override(m.id)}>Card Club override</Button>}
                {s?.personal_profile_id && <Button size="sm" variant="ghost" asChild><Link to={`/dashboard?admin_view_personal=${s.personal_profile_id}`}>Open customer</Link></Button>}
                <Button size="sm" variant="ghost" asChild><Link to="/admin/fulfillment">Print queue</Link></Button>
              </div>
            </div>
          );
        })}
        {!rows.length && <p className="text-muted-foreground">No paid orders yet.</p>}
      </div>
    </div>
  );
}
