import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, BarChart3, Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentOffer = {
  profileId: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  headerUrl: string | null;
  amount: number;
  currency: string;
  interval: string;
  cardCount: number;
  visits: number;
  googleClicks: number;
  yelpClicks: number;
  instagramClicks: number;
  totalClicks: number;
  since: string | null;
  lastActivityAt: string | null;
  historicalViews?: number;
  directionsClicks?: number;
  contactSaves?: number;
};

/** A payment request is an offer to resume service, never proof of ownership. */
export default function HubPaymentOffer({ offer, checkoutAvailable }: { offer: PaymentOffer; checkoutAvailable: boolean }) {
  const [params] = useSearchParams();
  const sessionId = params.get("activation") === "success" ? params.get("session_id") : null;
  const [expanded, setExpanded] = useState(!!sessionId);
  const [busy, setBusy] = useState(false);
  const checkoutInFlight = useRef(false);
  const [error, setError] = useState("");
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [status, setStatus] = useState<"idle" | "checking" | "pending" | "paid" | "active" | "error">(sessionId ? "checking" : "idle");

  useEffect(() => {
    if (!sessionId) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    setStatus("checking");
    const check = async () => {
      try {
        const { data, error: checkError } = await supabase.functions.invoke("hub-payment-request", {
          body: { action: "status", slug: offer.slug, sessionId },
        });
        if (canceled) return;
        if (checkError || !data || data.error) throw new Error("Could not check payment");
        if (data.active === true && data.paid === true) {
          setStatus("active");
          return;
        }
        setStatus(data.paid === true ? "paid" : "pending");
        if (++checks < 6) timer = setTimeout(check, 2500);
      } catch {
        if (!canceled) setStatus("error");
      }
    };
    void check();
    return () => { canceled = true; if (timer) clearTimeout(timer); };
  }, [offer.slug, sessionId, checkAttempt]);

  const checkout = async () => {
    if (checkoutInFlight.current || busy || !checkoutAvailable || sessionId) return;
    checkoutInFlight.current = true;
    setError("");
    setBusy(true);
    try {
      const { data, error: checkoutError } = await supabase.functions.invoke("hub-payment-request", {
        body: { action: "checkout", slug: offer.slug },
      });
      if (checkoutError || !data?.url) throw new Error("Checkout unavailable");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid checkout destination");
      window.location.assign(url.href);
    } catch {
      setError("We couldn’t open secure checkout. Please try again, or email tap@tapaway.co for help.");
      checkoutInFlight.current = false;
      setBusy(false);
    }
  };

  const metrics = [
    [offer.visits, "Hub views"],
    [offer.googleClicks, "Google clicks"],
    [offer.yelpClicks, "Yelp clicks"],
    [offer.instagramClicks, "Instagram clicks"],
    ...((offer.directionsClicks ?? 0) > 0 ? [[offer.directionsClicks!, "Directions clicks"] as const] : []),
    ...((offer.contactSaves ?? 0) > 0 ? [[offer.contactSaves!, "Contact saves"] as const] : []),
  ] as const;
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(offer.amount / 100);
  const canCheckout = checkoutAvailable && !sessionId;
  const showMobileCheckout = expanded && canCheckout;

  return (
    <main className={`min-h-[100dvh] bg-[#faf8f1] px-4 pt-6 text-[#19382b] sm:py-10 ${showMobileCheckout ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-6"}`}>
      <div className="mx-auto w-full max-w-[480px]">
        <a href="/" className="inline-flex text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4">TapAway<span className="text-[#6a8663]">.</span></a>
        <section className="mt-7 overflow-hidden rounded-[28px] border border-[#dfE6d8] bg-white shadow-[0_12px_45px_rgba(37,60,40,0.05)]" aria-labelledby="paused-title">
          {offer.headerUrl && <img src={offer.headerUrl} alt="" className="h-28 w-full object-cover sm:h-36" loading="eager" />}
          <div className="px-5 py-7 text-center sm:px-7">
            {offer.photoUrl ? <img src={offer.photoUrl} alt="" className="mx-auto h-20 w-20 rounded-2xl border border-[#e6eadf] bg-white object-contain p-1" loading="eager" /> : <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf3e6] text-2xl font-bold">{offer.name.slice(0, 1)}</div>}
            <p className="mt-4 break-words text-lg font-semibold">{offer.name}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#f4f1e6] px-3 py-1 text-xs font-medium text-[#695e3c]">{status === "active" ? "Ready to reconnect" : "Temporarily paused"}</span>
            <h1 id="paused-title" className="mt-4 text-[26px] font-semibold leading-tight tracking-tight">{status === "active" ? "Your TapAway page is ready." : "This TapAway page is paused."}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5b695e]">{status === "active" ? "Your existing cards and QR codes work with the same page." : "The business’s links are currently unavailable. Its page and card setup are saved."}</p>
            {!expanded && <button type="button" onClick={() => setExpanded(true)} aria-expanded={false} aria-controls="owner-payment-offer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#234d37] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#183c29] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#234d37]">Do you own this business?<ArrowRight className="h-4 w-4 shrink-0" /></button>}
          </div>
        </section>

        {expanded && <section id="owner-payment-offer" className="mt-5 space-y-5" aria-labelledby="owner-offer-title">
          <div className="rounded-2xl border border-[#dfe6d8] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#63745b]"><BarChart3 className="h-4 w-4" />Your connections so far</div>
            <h2 id="owner-offer-title" className="mt-2 text-xl font-semibold">See what your cards are doing.</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5b695e]">Here’s the activity recorded for your TapAway page.</p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {metrics.map(([value, label]) => <div key={label} className="rounded-2xl bg-[#f5f7ef] p-4"><dd className="text-2xl font-semibold tabular-nums">{Math.max(0, value).toLocaleString()}</dd><dt className="mt-1 text-xs text-[#586953]">{label}</dt></div>)}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-[#66705f]">{offer.totalClicks.toLocaleString()} link clicks. Clicks show interest, not confirmed reviews or unique customers. Counts exclude recognized bot and preview traffic.{offer.since && ` Tracked since ${new Date(offer.since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}</p>
            {!!offer.historicalViews && <p className="mt-2 text-xs leading-relaxed text-[#66705f]">Earlier records also include {offer.historicalViews.toLocaleString()} views, shown separately because they used an older tracking method.</p>}
          </div>

          <div className="rounded-2xl border border-[#cddfbd] bg-[#eff5e7] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#63745b]">Keep the connections coming</p>
            <div className="mt-2 flex items-baseline gap-1"><span className="text-4xl font-semibold tracking-tight">{price}</span><span className="text-sm text-[#5b695e]">/month</span></div>
            <p className="mt-2 text-sm leading-relaxed">Reconnect the {offer.cardCount} cards you already have.</p>
            <ul className="mt-5 space-y-3 text-sm">
              {["Your same cards, QR codes and page address", "Your review links, socials and business links", "Your dashboard, analytics and anytime updates"].map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#47783b]" /><span>{item}</span></li>)}
            </ul>

            {sessionId && <div className="mt-5 rounded-xl border border-[#d3dfc7] bg-white p-4 text-sm leading-relaxed" role="status" aria-live="polite">
              {status === "checking" && <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking your payment securely…</p>}
              {status === "pending" && <><p>Payment hasn’t been confirmed yet. Your page will reopen after payment is verified.</p><button type="button" onClick={() => setCheckAttempt(n => n + 1)} className="mt-2 min-h-10 font-semibold underline underline-offset-4">Check payment again</button></>}
              {status === "paid" && <><p>Payment confirmed. We’re finishing the setup for your page.</p><button type="button" onClick={() => setCheckAttempt(n => n + 1)} className="mt-2 min-h-10 font-semibold underline underline-offset-4">Refresh status</button></>}
              {status === "active" && <><p className="font-semibold">Payment confirmed. Your page is active.</p><a href={`/${encodeURIComponent(offer.slug)}`} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">Open my page<ArrowRight className="h-4 w-4" /></a><p className="mt-3 text-xs text-[#5b695e]">Already manage this business? <a href="/auth" className="underline">Sign in to your existing dashboard.</a> Need access? <a href="mailto:tap@tapaway.co" className="underline">Contact TapAway.</a></p></>}
              {status === "error" && <><p>We couldn’t check the payment status. If you’ve paid, please don’t pay again.</p><button type="button" onClick={() => setCheckAttempt(n => n + 1)} className="mt-2 min-h-10 font-semibold underline underline-offset-4">Try checking again</button></>}
            </div>}

            {!sessionId && <>
              <button type="button" onClick={checkout} disabled={!canCheckout || busy || status === "error"} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#234d37] px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#183c29] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#234d37]">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Opening secure checkout…</> : <><CreditCard className="h-4 w-4 shrink-0" />Activate for {price}/month</>}</button>
              {!checkoutAvailable && <p className="mt-3 text-sm leading-relaxed">Checkout is temporarily unavailable. Please contact us below and we’ll help.</p>}
              <p className="mt-3 text-xs leading-relaxed text-[#56684c]">{price} charged today, then monthly until canceled. Cancel anytime. No new card order is needed.</p>
            </>}
            {error && <p role="alert" className="mt-4 rounded-xl bg-white p-3 text-sm leading-relaxed text-[#9a3412]">{error}</p>}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#5c7051]"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout with Stripe</div>
          </div>
        </section>}
        <footer className="py-7 text-center text-xs leading-relaxed text-[#66705f]">Questions? <a className="inline-block py-2 font-semibold underline underline-offset-4" href="mailto:tap@tapaway.co">Talk to TapAway</a></footer>
      </div>
      {showMobileCheckout && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe6d8] bg-[#fffdf7] px-4 pt-3 shadow-[0_-4px_24px_rgba(37,60,40,0.07)] sm:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }} aria-label="Activate your cards">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
          <div className="min-w-0 flex-1"><p className="text-lg font-semibold">{price}<span className="text-xs font-normal text-[#5b695e]">/month</span></p><p className="mt-0.5 text-[11px] leading-tight text-[#5b695e]">Renews monthly · Cancel anytime</p></div>
          <button type="button" aria-label="Activate" onClick={checkout} disabled={busy || !canCheckout} className="inline-flex min-h-12 min-w-28 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#234d37] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#234d37]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Activate<ArrowRight className="h-4 w-4" /></>}</button>
        </div>
      </div>}
    </main>
  );
}
