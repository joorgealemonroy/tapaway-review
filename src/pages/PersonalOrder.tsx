import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  HelpLink,
  StorefrontFooter,
} from "@/components/landing/StorefrontSections";
import { callFunction } from "@/lib/paymentFirst";
import { loadCardDraft, newDraft, saveCardDraft } from "@/lib/cardDesign";
type Order = {
  orderId?: string;
  paid?: boolean;
  status?: string;
  productionStatus?: string;
  hosted?: boolean;
  checkoutStatus?: string;
  error?: string;
};
export default function PersonalOrder() {
  const [params] = useSearchParams(),
    sessionId = params.get("session_id");
  const [order, setOrder] = useState<Order | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const check = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      const { ok, data } = await callFunction<Order>("personal-card-order", {
        action: "status",
        sessionId,
      });
      if (!ok)
        throw new Error(data.error || "We couldn't confirm the order yet.");
      setOrder(data);
      if (data.paid) {
        const draft = await loadCardDraft().catch(() => null);
        if (draft?.id === data.orderId)
          await saveCardDraft(newDraft()).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry in a moment.");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);
  useEffect(() => {
    void check();
  }, [check]);
  const pending =
    order &&
    !order.paid &&
    order.status !== "refunded" &&
    order.status !== "disputed";
  return (
    <div className="storefront min-h-screen">
      <Helmet>
        <title>Your personal card order | TapAway</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <LandingNav />
      <main className="sf-container sf-section max-w-2xl" id="main-content">
        {order?.paid ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-700 mb-5" />
            <p className="sf-eyebrow">Order confirmed</p>
            <h1 className="sf-title">Your cards are in the works.</h1>
            <p className="sf-copy mt-5">
              We've received your payment and the artwork you reviewed. Our team
              will check it, print both cards, program their links, and ship
              your order.
            </p>
            <div className="sf-status">
              <strong>What's next</strong>
              <p>Artwork check → print & program → free US shipping.</p>
              <p className="mt-2">
                Current step: {order.productionStatus?.replace(/_/g, " ")}
              </p>
            </div>
            {order.hosted && (
              <section className="sf-status mt-5">
                <h2 className="text-xl font-semibold">Now, make your hub yours.</h2>
                <ol className="my-4 space-y-3 text-sm"><li><strong>1. Pick your address.</strong> Choose an available tapaway.co/yourname in your dashboard.</li><li><strong>2. Add a little personality.</strong> Photos, colors, text, and optional links. No existing website needed.</li><li><strong>3. Keep it fresh.</strong> Update it anytime, 24/7, and see visits and link activity in your analytics.</li></ol>
                <Link to="/dashboard?type=lite&welcome=true" className="sf-button mb-4">Customize my hub</Link>
                <p className="sf-copy">Your first month of hosting is paid.
                Hosting renews at $5/month until canceled. Use your checkout
                email to{" "}
                <Link to="/support#access" className="underline">
                  get your dashboard access link
                </Link>{" "}
                if you are not signed in yet. Both cards will keep opening your hub as you make it your own.
              </p></section>
            )}
            <p className="sf-price-note mt-5">
              Order reference: {order.orderId}
            </p>
            <div className="flex flex-wrap gap-4 mt-7">
              <Link className="sf-button" to="/support#question">
                Ask about my order
              </Link>
              <Link className="sf-button secondary" to="/personal">
                Back to personal cards
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="sf-title">
              {!sessionId
                ? "Looking for your order?"
                : "Let's confirm your order."}
            </h1>
            {busy && (
              <p className="sf-status flex gap-3" role="status">
                <Loader2 className="animate-spin" />
                Checking secure payment confirmation…
              </p>
            )}
            {error && (
              <p role="alert" className="sf-status">
                {error} If you completed payment, please don't place another
                order. Use your confirmation email or contact our team.
              </p>
            )}
            {pending && (
              <p className="sf-copy mt-5">
                Payment confirmation is still pending. Check again in a moment;
                you don't need to pay again.
              </p>
            )}
            {order && ["refunded", "disputed"].includes(order.status || "") && (
              <p className="sf-copy mt-5">
                This order needs help from our team. Please contact us with your
                order reference: {order.orderId}.
              </p>
            )}
            <div className="flex gap-4 mt-6">
              {sessionId && (
                <button className="sf-button" disabled={busy} onClick={check}>
                  Check again
                </button>
              )}
              <Link className="sf-button secondary" to="/support#question">
                Get order help
              </Link>
            </div>
          </>
        )}
      </main>
      <StorefrontFooter />
      <HelpLink />
    </div>
  );
}
