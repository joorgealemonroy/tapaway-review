import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingCatalog, CARD_QUANTITIES, formatCatalogPrice, type OnboardingPlan, type BillingInterval } from "@/lib/onboardingCatalog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type Summary = { name: string; slug: string; logo: string | null; paid: boolean };
export default function SubscriptionInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("invite"), sessionId = params.get("session_id");
  const { catalog, loading: pricesLoading, failed, retry } = useOnboardingCatalog();
  const [summary, setSummary] = useState<Summary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [plan, setPlan] = useState<OnboardingPlan>("solo"), [interval, setInterval] = useState<BillingInterval>("month"), [club, setClub] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(sessionId ? "checking" : null), [sent, setSent] = useState(false);
  useEffect(() => {
    let current = true; setLoading(true); setSummary(null); setError(false);
    supabase.functions.invoke("subscription-invitation", { body: { action: "summary", token } }).then(({ data, error: failure }) => { if (!current) return; if (failure || !data?.slug) setError(true); else setSummary(data); }).catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [token]);
  useEffect(() => {
    if (!sessionId || !token) return;
    let current = true, timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try { const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "status", token, sessionId } }); if (!current) return; if (failure || !data?.status) setStatus("unavailable"); else { setStatus(data.status); setSent(data.emailSent === true); if (data.status === "processing") timer = setTimeout(check, 3000); } } catch { if (current) setStatus("unavailable"); }
    };
    void check(); return () => { current = false; clearTimeout(timer); };
  }, [token, sessionId]);
  const item = catalog.find(p => p.plan === plan && p.interval === interval);
  const total = item?.available ? item.amount + (club ? interval === "year" ? 6000 : 500 : 0) : null;
  const checkout = async () => { setBusy(true); try { const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "checkout", token, plan, interval, cardClub: club } }); if (failure || !data?.url) throw new Error(data?.error || "Checkout unavailable. Confirm this invitation with your admin."); window.location.assign(data.url); } catch (e) { toast.error(e instanceof Error ? e.message : "Checkout unavailable"); setBusy(false); } };
  return <main className="min-h-screen bg-background text-foreground px-4 py-10"><Helmet><title>TapAway · Invite to subscribe</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet><div className="mx-auto max-w-lg space-y-7">
    {loading ? <div role="status" className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : error || !summary ? <section className="space-y-3"><h1 className="text-2xl font-bold">Invitation expired or unavailable</h1><p className="text-muted-foreground">Ask your admin for a new payment link. Your existing public hub is unchanged.</p></section> : <>
      <header className="space-y-3">{summary.logo && <img src={summary.logo} alt="" className="h-20 w-20 rounded-lg object-contain" />}<p className="text-sm text-muted-foreground">TapAway · Invite to subscribe</p><h1 className="text-2xl font-bold">{summary.name}</h1><p className="text-muted-foreground">Your hub and existing cards stay online. Choose your subscription and included cards.</p><Button asChild variant="outline"><a href={`/${summary.slug}`} target="_blank" rel="noopener noreferrer">View existing hub<ExternalLink className="ml-2 h-4 w-4" /></a></Button></header>
      {status === "paid" || !sessionId && summary.paid ? <section className="space-y-3" role="status"><h2 className="text-xl font-bold">Payment confirmed</h2><p>{sent ? "Your secure dashboard-access link has been emailed to the intended owner." : "Your payment is confirmed. Your access email is being prepared."}</p><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "resend", token } }); setBusy(false); if (failure || !data?.sent) toast.error("Access email unavailable; try later"); else toast.success("New secure access link sent"); }}>Request a fresh access email</Button></section> : status === "checking" || status === "processing" ? <section role="status"><Loader2 className="h-6 w-6 animate-spin" /><h2 className="mt-3 text-xl font-bold">Confirming your payment</h2><p className="mt-2 text-muted-foreground">Do not pay again. Your hub remains online.</p></section> : status === "review" || status === "unavailable" ? <section role="alert"><h2 className="text-xl font-bold">Payment needs confirmation</h2><p className="mt-2">Contact your admin before paying again. Your hub is unchanged.</p></section> : <>
      {(params.has("canceled") || status === "not_paid" || status === "expired") && <p role="status" className="text-muted-foreground">Payment was not confirmed. Your hub stays online; you can retry below.</p>}
      <section className="space-y-4"><h2 className="text-lg font-semibold">Included cards</h2><RadioGroup value={plan} onValueChange={v => setPlan(v as OnboardingPlan)} className="grid grid-cols-2 gap-3">{(["solo", "venue"] as const).map(p => <Label key={p} htmlFor={`plan-${p}`} className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-border p-3"><RadioGroupItem id={`plan-${p}`} value={p} /><span>{CARD_QUANTITIES[p]} cards<br /><span className="text-sm text-muted-foreground">TapAway {p === "solo" ? "Solo" : "Pro"}</span></span></Label>)}</RadioGroup><RadioGroup value={interval} onValueChange={v => setInterval(v as BillingInterval)} className="flex gap-6">{(["month", "year"] as const).map(v => <Label key={v} className="flex min-h-11 items-center gap-2"><RadioGroupItem value={v} />{v === "month" ? "Monthly" : "Yearly"}</Label>)}</RadioGroup>
        <div className="flex items-start gap-3 border-y border-border py-4"><Checkbox id="club" checked={club} onCheckedChange={v => setClub(v === true)} /><Label htmlFor="club" className="space-y-2 leading-relaxed"><span>Card Club · {interval === "year" ? "$60/year" : "$5/month"}</span><span className="block text-sm font-normal text-muted-foreground">Up to {CARD_QUANTITIES[plan]} replacement cards each rolling month, starting after your first paid invoice and the waiting period. One pending request at a time.</span></Label></div>
      </section><section className="space-y-3"><p className="text-muted-foreground">Plan: {formatCatalogPrice(item)}{club ? ` + Card Club ${interval === "year" ? "$60/year" : "$5/month"}` : ""}</p><p className="text-2xl font-bold">{total === null ? "Unavailable" : `$${total / 100} due today`}</p><p className="text-sm text-muted-foreground">{total !== null && `$${total / 100} renews ${interval === "year" ? "yearly" : "monthly"}. `}No free trial. {club && "Card Club is included on the same subscription and invoice. "}Cancel anytime. Dashboard access is emailed to the confirmed owner, not transferred to a payer.</p>{failed && <Button variant="outline" onClick={retry}>Retry prices</Button>}<Button className="min-h-12 w-full" disabled={busy || pricesLoading || total === null} onClick={checkout}>{busy || pricesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue to secure payment"}</Button></section>
      </>}
    </>}
  </div></main>;
}

export function SubscriptionInvitationAccessPage() {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token"));
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { window.history.replaceState(null, "", window.location.pathname); }, []);
  const verify = async () => { setBusy(true); try { const { data, error: failure } = await supabase.functions.invoke("subscription-invitation", { body: { action: "access", accessToken: token } }); if (failure || !data?.session) throw new Error(data?.error || "This link is expired or already used. Request a new email from your payment invitation."); const saved = await supabase.auth.setSession(data.session); if (saved.error) throw saved.error; navigate("/dashboard", { replace: true }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify access"); setBusy(false); } };
  return <main className="min-h-screen bg-background px-4 py-16 text-foreground"><Helmet><title>Verify TapAway dashboard access</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet><section className="mx-auto max-w-md space-y-5"><h1 className="text-2xl font-bold">Verify dashboard access</h1><p className="text-muted-foreground">Confirm your email using this private one-use link.</p>{error && <p role="alert" className="text-destructive">{error}</p>}<Button className="min-h-12 w-full" disabled={busy || !token} onClick={verify}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify email & open dashboard"}</Button></section></main>;
}