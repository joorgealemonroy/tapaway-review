import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Brand } from "@/components/landing/LandingNav";
import {
  CARD_QUANTITIES,
  formatCatalogPrice,
  type BillingInterval,
  type CatalogItem,
  type OnboardingPlan,
} from "@/lib/onboardingCatalog";
import { getOnboardingData, saveOnboardingData } from "@/lib/onboardingData";
import "@/components/landing/storefront.css";

type Props = {
  plan: OnboardingPlan | null;
  interval: BillingInterval;
  catalog: CatalogItem[];
  loading: boolean;
  failed: boolean;
  busy: boolean;
  error: string | null;
  canceled: boolean;
  onRetry: () => void;
  onPlan: (p: OnboardingPlan) => void;
  onInterval: (i: BillingInterval) => void;
  onCheckout: (club: boolean) => void;
};
export function CheckoutOrder({
  plan,
  interval,
  catalog,
  loading,
  failed,
  busy,
  error,
  canceled,
  onRetry,
  onPlan,
  onInterval,
  onCheckout,
}: Props) {
  const [club, setClub] = useState(
    () => canceled && getOnboardingData().cardClubSelected === true,
  );
  const item = catalog.find((i) => i.plan === plan && i.interval === interval);
  const canCheckout = !loading && !failed && item?.available === true;
  const trial = item?.trialDays ?? 0;
  const savedAudience = getOnboardingData().audience;
  return (
    <div className="checkout-surface min-h-screen">
      <Helmet>
        <title>Your TapAway order | Custom Cards & Digital Hub</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="co-header">
        <div className="sf-container flex items-center justify-between gap-3">
          <Brand />
          <Link to="/support#question" className="sf-text-link text-xs">
            <MessageCircle className="h-4 w-4" />
            Need a hand?
          </Link>
        </div>
      </header>
      <main className="sf-container co-layout" id="main-content">
        <section>
          <Link
            to={
              savedAudience === "personal" ? "/personal#pricing" : "/#pricing"
            }
            className="sf-text-link text-xs text-[#697360]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
          <p className="sf-eyebrow block mt-8">
            Your cards. Your hub. All set up.
          </p>
          <h1>
            Let's get your
            <br />
            TapAway started.
          </h1>
          <p className="sf-copy text-sm">
            Choose your cards and billing. After checkout, we'll collect your
            details and take care of the setup.
          </p>
          {canceled && (
            <p className="sf-status" role="status">
              You left checkout before finishing. Review your selection and
              continue when you're ready. Your trial starts only after checkout
              is confirmed.
            </p>
          )}
          {loading && (
            <p className="sf-status" role="status">
              Checking current prices…
            </p>
          )}
          {failed && (
            <div className="sf-status" role="alert">
              We couldn't load prices. Your checkout is paused.
              <button onClick={onRetry}>Try again</button>
            </div>
          )}
          <fieldset disabled={busy} className="mt-7">
            <legend className="text-sm font-semibold mb-3">
              1. Choose billing
            </legend>
            <div className="sf-billing">
              {(["year", "month"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={interval === i}
                  onClick={() => onInterval(i)}
                >
                  {i === "year" ? "Yearly" : "Monthly"}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={busy} className="mt-7">
            <legend className="text-sm font-semibold">
              2. Choose your cards
            </legend>
            <div className="co-options">
              {(["solo", "venue"] as const).map((p) => {
                const price = catalog.find(
                  (i) => i.plan === p && i.interval === interval,
                );
                return (
                  <button
                    key={p}
                    className="co-option"
                    type="button"
                    aria-pressed={plan === p}
                    disabled={loading || price?.available !== true}
                    onClick={() => onPlan(p)}
                  >
                    <strong>{CARD_QUANTITIES[p]} cards</strong>
                    <span>
                      {loading ? "Checking…" : formatCatalogPrice(price)}
                    </span>
                    <small>
                      {price?.available
                        ? price.trialDays > 0
                          ? `After ${price.trialDays} days free`
                          : "Billed at checkout"
                        : "Try another billing interval"}
                    </small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <ul className="sf-checklist">
            {[
              "Custom NFC + QR cards",
              "Your hub, designed and set up for you",
              "Free standard US shipping",
              "Dashboard access and ongoing support",
            ].map((t) => (
              <li key={t}>
                <Check />
                {t}
              </li>
            ))}
          </ul>
          <label className="co-club">
            <input
              type="checkbox"
              checked={club}
              disabled={busy}
              onChange={(e) => {
                setClub(e.target.checked);
                saveOnboardingData({ cardClubSelected: e.target.checked });
              }}
            />
            <span>
              <strong>
                Add Card Club · $5/month{" "}
                <span className="font-normal">(optional)</span>
              </strong>
              <small>
                Request up to{" "}
                {plan ? CARD_QUANTITIES[plan] : "your plan's quantity of"}{" "}
                replacement cards when eligible, with standard shipping
                included. First eligibility follows your first paid invoice and
                waiting period; timing appears in your dashboard.
              </small>
              <small>
                Only offered with your first order. Billed separately each month
                after the trial, even with yearly billing. No rollover.
              </small>
            </span>
          </label>
        </section>
        <aside className="co-summary" aria-label="Order summary">
          <h2>Your order</h2>
          <p className="sf-price-note mt-2">
            {plan
              ? `${CARD_QUANTITIES[plan]} custom cards + your digital hub`
              : "Choose a card pack to continue"}
          </p>
          <div className="co-row mt-5">
            <span>Design & setup</span>
            <strong>Included</strong>
          </div>
          <div className="co-row">
            <span>Standard US shipping</span>
            <strong>Free</strong>
          </div>
          <div className="co-row">
            <span>Subscription{trial > 0 ? " after trial" : ""}</span>
            <strong>
              {canCheckout
                ? formatCatalogPrice(item)
                : "Select an available plan"}
            </strong>
          </div>
          {club && (
            <div className="co-row">
              <span>Card Club{trial > 0 ? " after trial" : ""}</span>
              <strong>+$5/month</strong>
            </div>
          )}
          <div className="co-row co-total">
            <div>
              <span>
                {trial > 0 ? "Subscription due today" : "Subscription"}
              </span>
              {trial > 0 && (
                <p className="sf-price-note">{trial}-day free trial</p>
              )}
            </div>
            <strong>
              {canCheckout
                ? trial > 0
                  ? "$0"
                  : formatCatalogPrice(item)
                : "—"}
            </strong>
          </div>
          {canCheckout && (
            <p className="sf-price-note mt-3">
              {interval === "year"
                ? `The full $${(item!.amount / 100).toLocaleString("en-US")} annual total is billed ${trial > 0 ? "after your trial" : "at checkout"}. `
                : ""}
              {club && interval === "month"
                ? `With Card Club: $${((item!.amount + 500) / 100).toFixed(2)}/month after the trial. `
                : ""}
              {club && interval === "year"
                ? "Card Club adds a separate $5 monthly renewal. "
                : ""}
              Renews until canceled.{" "}
              {trial > 0
                ? "Cancel before your trial ends to avoid the first subscription charge."
                : ""}
            </p>
          )}
          <p className="sf-price-note mt-3">
            Card on file required. A temporary $1 verification hold may appear.
            Your bank determines when it clears.
          </p>
          {error && (
            <div className="sf-status" role="alert">
              {error}{" "}
              <Link to="/support#question" className="underline">
                Get help
              </Link>
            </div>
          )}
          <button
            className="sf-button w-full mt-6"
            disabled={!canCheckout || busy}
            onClick={() => onCheckout(club)}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                Opening checkout…
              </>
            ) : (
              <>
                Continue to secure checkout <ArrowRight />
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-[#68745f] flex items-center justify-center gap-2">
            <LockKeyhole className="h-3 w-3" />
            Powered by Stripe · No account needed first
          </p>
          <p className="sf-price-note mt-6 text-[11px]">
            By continuing, you agree to the{" "}
            <Link to="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            . See our{" "}
            <Link to="/refund" className="underline">
              Refund Policy
            </Link>
            . Canceling stops the next renewal; it does not automatically refund
            the current term.
          </p>
          <div className="border-t border-[#dce4d3] mt-6 pt-5">
            <h3 className="text-sm font-semibold">What happens next?</h3>
            <p className="sf-price-note mt-2">
              Secure checkout → confirm your{" "}
              {savedAudience === "personal" ? "name or brand" : "business"} and
              shipping → we prepare your hub and cards. Access your dashboard
              using your checkout email.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
