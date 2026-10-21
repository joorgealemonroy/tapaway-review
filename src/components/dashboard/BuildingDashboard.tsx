import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { callFunction } from "@/lib/paymentFirst";
import { track } from "@/lib/analytics";

type Address = { name?: string; line1?: string; line2?: string | null; city?: string; state?: string; postal_code?: string };
type State = {
  session: { step: string; setup_status: string; logo_url: string | null; business_name: string | null; shipping_address: Address | null } | null;
  intent: { card_quantity: number } | null;
  club: { id: string; status: string; billingInterval?: "month" | "year"; billingWithPlan?: boolean } | null;
  entitlement: { eligible: boolean; reason: string; quantity: number; next_eligible_at: string | null } | null;
  reprintPriceCents: number | null;
  redemption: { status: string; requested_at: string; approved_at: string | null; shipped_at: string | null; tracking_number: string | null } | null;
};

const ORDER = ["purchase_complete", "business_identified", "needs_business_research", "logo_received", "logo_needed", "links_being_prepared", "hub_ready", "cards_ready_to_print", "cards_printed", "ready_to_ship", "shipped"];
const reached = (status: string, target: string) => ORDER.indexOf(status) >= ORDER.indexOf(target);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");

export default function BuildingDashboard({ embedded = false, profileId }: { embedded?: boolean; profileId?: string } = {}) {
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    if (!t) return;
    setLoadError(false);
    try {
      const { ok, data } = await callFunction<State>("payment-first-onboarding", { action: "state", profileId }, t);
      if (!ok) throw new Error("Unavailable");
      setState(data);
    } catch { setLoadError(true); }
  }, [profileId]);
  useEffect(() => { load(); }, [load]);

  if (loadError) return <div className="p-6 space-y-3"><p>We couldn't load your card options.</p><Button onClick={load}>Try again</Button><Button asChild variant="outline"><Link to="/support#question">Get help</Link></Button></div>;
  if (!state) return <div className="flex min-h-screen items-center justify-center bg-hero"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const s = state.session;
  if (s && s.step !== "done") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-hero px-4 text-center text-hero-foreground">
      <h1 className="text-2xl font-bold">Let's finish your setup</h1>
      <p className="text-hero-foreground/70">Just a couple of quick questions left.</p>
      <Button asChild className="h-12 px-8"><Link to="/welcome">Continue setup</Link></Button>
    </div>
  );
  const status = s?.setup_status ?? "purchase_complete";
  const progress: [string, boolean][] = [
    ["Business received", true],
    ["Logo received", !!s?.logo_url],
    ["Links being prepared", reached(status, "hub_ready")],
    ["Cards being prepared", reached(status, "cards_printed")],
    [status === "shipped" ? "Shipped" : "Shipping pending", status === "shipped"],
  ];
  const club = state.club;
  const ent = state.entitlement;
  const qty = ent?.quantity ?? state.intent?.card_quantity ?? 4;
  const clubActive = club?.status === "active";
  const clubPrice = club?.billingInterval === "year" ? "$60/year" : "$5/month";

  const submit = async () => {
    setBusy(true); setMessage(null);
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    const { ok, data } = await callFunction<{ error?: string }>("card-club-request", { membershipId: club?.id, idempotencyKey: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, designNote: note }, t);
    setBusy(false);
    if (ok) { track("card_club_replacement_requested", { hubKind: "site" }); setRequesting(false); setMessage("Request received. We'll print and ship your fresh cards."); load(); }
    else setMessage(data.error || "Something went wrong.");
  };

  return (
    <div className={embedded ? "bg-hero text-hero-foreground rounded-xl" : "min-h-screen bg-hero text-hero-foreground"}>
      <main className="mx-auto max-w-xl space-y-8 px-4 py-10">
        {!embedded && <section>
          <h1 className="text-2xl font-bold">We're building your TapAway</h1>
          {s?.business_name && <p className="mt-1 text-hero-foreground/70">{s.business_name}</p>}
          <ul className="mt-5 space-y-3">
            {progress.map(([label, done]) => <li key={label} className="flex items-center gap-3">{done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-hero-foreground/40" />}<span className={done ? "" : "text-hero-foreground/70"}>{label}</span></li>)}
          </ul>
          <p className="mt-4 text-sm text-hero-foreground/60">Nothing else needed from you. You'll be able to edit your page once it's ready.</p>
        </section>}

        {club && club.status !== "declined" && club.status !== "cancelled" ? (
          <section className="rounded-2xl border border-hero-foreground/15 p-5">
            <h2 className="text-xl font-bold">TapAway Card Club</h2>
            <p className="mt-1 text-sm text-hero-foreground/70">{clubActive ? `Active · ${clubPrice}` : club.status === "past_due" ? "Payment issue · update your card to keep Card Club" : `Starts when your trial ends · ${clubPrice}`}</p>
            {club.billingWithPlan && <p className="mt-2 text-xs text-hero-foreground/70">Included in your business subscription and its renewal. No separate checkout.</p>}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-hero-foreground/70">Replacement allowance</dt><dd>Up to {qty} cards</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-hero-foreground/70">Standard shipping</dt><dd>Included</dd></div>
              {ent?.next_eligible_at && <div className="flex justify-between gap-4"><dt className="text-hero-foreground/70">Next eligible replacement</dt><dd>{ent.eligible ? "Available now" : fmtDate(ent.next_eligible_at)}</dd></div>}
              {!ent?.next_eligible_at && <div className="flex justify-between gap-4"><dt className="text-hero-foreground/70">First replacement</dt><dd>After your first paid invoice and the waiting period</dd></div>}
            </dl>
            {state.redemption && ["requested", "in_review"].includes(state.redemption.status) && <p className="mt-5 rounded-lg bg-hero-foreground/10 p-3 text-sm">Replacement request pending. We'll review it shortly.</p>}
            {state.redemption && ["approved", "printing", "shipped"].includes(state.redemption.status) && (
              <p className="mt-5 rounded-lg bg-hero-foreground/10 p-3 text-sm">Latest replacement: {state.redemption.status === "approved" ? "approved, being prepared" : state.redemption.status === "printing" ? "being printed" : `shipped${state.redemption.tracking_number ? ` · tracking ${state.redemption.tracking_number}` : ""}`}</p>
            )}
            {ent?.eligible && !requesting && <Button className="mt-5 h-12 w-full" onClick={() => { setRequesting(true); track("card_club_request_viewed", { hubKind: "site" }); }}>Request Fresh Cards</Button>}
            {requesting && (
              <div className="mt-5 space-y-4">
                <h3 className="text-lg font-bold">Ready for a fresh batch?</h3>
                <p className="text-sm">{qty} fresh TapAway cards · Standard shipping included</p>
                {s?.shipping_address && <p className="text-sm text-hero-foreground/75">Shipping to {s.shipping_address.line1}, {s.shipping_address.city}, {s.shipping_address.state} {s.shipping_address.postal_code}</p>}
                <div className="space-y-1"><Label htmlFor="design-note">Need a basic update before printing? (optional)</Label><Textarea id="design-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="New logo, phone number, business name…" /></div>
                <p className="text-xs text-hero-foreground/60">Leave blank to use your current card design. Bigger redesigns are reviewed by our team.</p>
                <Button className="h-12 w-full" disabled={busy} onClick={submit}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request My Cards"}</Button>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-hero-foreground/15 p-5">
            <h2 className="text-xl font-bold">Need more cards?</h2>
            <p className="mt-2 text-sm text-hero-foreground/75">{club?.status === "cancelled" ? "Your Card Club membership has ended, but you can still order replacement cards anytime." : "Card Club wasn't added to your original order, but you can still order replacement cards anytime."}</p>
            <p className="mt-2 text-sm text-hero-foreground/75">{state.reprintPriceCents ? `Replacement batches are $${(state.reprintPriceCents / 100).toFixed(2)} plus shipping.` : "Contact us for reprint pricing."}</p>
            <Button asChild variant="secondary" className="mt-4 h-12 w-full"><Link to="/support">Contact Us</Link></Button>
          </section>
        )}
        {message && <p role="status" className="text-sm">{message}</p>}
      </main>
    </div>
  );
}
