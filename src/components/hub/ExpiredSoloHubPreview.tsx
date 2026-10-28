import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ExpiredProfilePreview } from "@/hooks/useProfileData";
import HubPaymentOffer, { type PaymentOffer } from "./HubPaymentOffer";

/** Public branding only. Links remain gated until the server grants access. */
export const ExpiredSoloHubPreview = ({ preview }: { preview: ExpiredProfilePreview }) => {
  const [offer, setOffer] = useState<PaymentOffer | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setFailed(false);
    setOffer(null);
    void supabase.functions.invoke("hub-payment-request", { body: { action: "summary", slug: preview.username } }).then(({ data, error }) => {
      if (canceled) return;
      if (error || !data || data.error) setFailed(true);
      else {
        setOffer(data.offer ?? null);
        setAvailable(data.checkoutAvailable === true);
      }
      setLoading(false);
    }).catch(() => {
      if (!canceled) { setFailed(true); setLoading(false); }
    });
    return () => { canceled = true; };
  }, [preview.username, attempt]);

  if (offer) return <HubPaymentOffer offer={offer} checkoutAvailable={available} />;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f1] px-5 py-10 text-[#19382b]">
      <section className="w-full max-w-md rounded-[28px] border border-[#dfe6d8] bg-white p-6 text-center sm:p-8">
        <a href="/" className="text-lg font-bold tracking-tight">TapAway.</a>
        {preview.profile_photo_url && <img src={preview.profile_photo_url} alt="" className="mx-auto mt-6 h-20 w-20 rounded-2xl object-contain" />}
        <p className="mt-4 break-words font-semibold">{preview.full_name || `@${preview.username}`}</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This TapAway page is paused.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5b695e]">The business’s links are currently unavailable. Its page and card setup are saved.</p>
        {loading ? <p role="status" className="mt-6 flex items-center justify-center gap-2 text-sm text-[#5b695e]"><Loader2 className="h-4 w-4 animate-spin" />Loading owner options…</p> : failed ? <div role="status" className="mt-5 text-sm leading-relaxed"><p>We couldn’t load the owner options.</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => setAttempt(n => n + 1)}>Try again</button></div> : <a href={`/auth?redirect=${encodeURIComponent("/dashboard?tab=plan")}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#234d37] px-4 py-3 text-sm font-semibold text-white">Do you own this business?<ArrowRight className="h-4 w-4" /></a>}
        <p className="mt-6 text-xs text-[#66705f]">Need help? <a href="mailto:tap@tapaway.co" className="inline-block py-2 font-semibold underline underline-offset-4">Talk to TapAway</a></p>
      </section>
    </main>
  );
};

export default ExpiredSoloHubPreview;
