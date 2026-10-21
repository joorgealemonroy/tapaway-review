import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
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
import {
  readBusinessBrief,
  saveBusinessBrief,
  type BusinessBrief,
} from "@/lib/businessBrief";
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
  onCheckout: (club: boolean, business?: BusinessBrief) => void;
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
  const [brief, setBrief] = useState(readBusinessBrief);
  const [manual, setManual] = useState(
    () => !!brief.name && !brief.googlePlaceId,
  );
  const [intakeError, setIntakeError] = useState("");
  const item = catalog.find((i) => i.plan === plan && i.interval === interval);
  const canCheckout =
    !loading &&
    !failed &&
    item?.available === true &&
    item.checkoutVersion === 2;
  const trial = item?.trialDays ?? 0;
  const clubAmount = interval === "year" ? 6000 : 500;
  const total = (item?.amount ?? 0) + (club ? clubAmount : 0);
  const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;
  const change = (key: keyof BusinessBrief, value: string) => {
    const next = { ...brief, [key]: value };
    setBrief(next);
    saveBusinessBrief(next);
  };
  return (
    <div className="checkout-surface min-h-screen">
      <Helmet>
        <title>Start your business trial | TapAway</title>
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
      <form
        className="sf-container co-layout"
        id="main-content"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCheckout || busy) return;
          if (!manual && !brief.googlePlaceId) {
            setIntakeError(
              "Choose your business from the search results, or enter it manually below.",
            );
            return;
          }
          setIntakeError("");
          onCheckout(club, {
            ...brief,
            name: brief.name.trim(),
            city: brief.city.trim(),
            link: brief.link.trim(),
          });
        }}
      >
        <section>
          <Link to="/#pricing" className="sf-text-link text-xs">
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
          <p className="sf-eyebrow block mt-8">
            A few details. We handle the rest.
          </p>
          <h1>
            Let's get your
            <br />
            business connected.
          </h1>
          <p className="sf-copy text-sm">
            Tell us where to find you. We'll build your hub, gather your links,
            and prepare your cards.
          </p>
          {canceled && (
            <p className="sf-status" role="status">
              Your selection is saved. Your trial starts when checkout is
              confirmed.
            </p>
          )}
          <fieldset disabled={busy} className="co-intake">
            <legend>1. Your business</legend>
            {!manual ? (
              <div className="co-wide co-place-finder">
                <GooglePlacesAutocomplete
                  variant="light"
                  label="Find your business on Google"
                  defaultValue={brief.googlePlaceId ? brief.name : ""}
                  placeholder="Start typing your business name…"
                  onQueryChange={() => {
                    if (brief.googlePlaceId) {
                      const next = {
                        ...brief,
                        googlePlaceId: undefined,
                        address: undefined,
                      };
                      setBrief(next);
                      saveBusinessBrief(next);
                    }
                  }}
                  onPlaceSelected={(place) => {
                    const next: BusinessBrief = {
                      ...brief,
                      name: place.name,
                      city: place.city || "",
                      state: place.state || "",
                      postalCode: place.postalCode || "",
                      googlePlaceId: place.placeId,
                      address: place.address,
                      link: place.website || place.googleMapsUri || brief.link,
                      phone: place.phone || "",
                      googleMapsUri: place.googleMapsUri || "",
                      lat: place.lat ?? undefined,
                      lng: place.lng ?? undefined,
                    };
                    setBrief(next);
                    saveBusinessBrief(next);
                    setIntakeError("");
                  }}
                />
                {brief.googlePlaceId && (
                  <div className="co-selected-place" role="status">
                    <Check size={18} />
                    <div>
                      <strong>{brief.name}</strong>
                      <p>{brief.address}</p>
                      <small>
                        We'll start with this listing. You can add more after
                        checkout.
                      </small>
                    </div>
                  </div>
                )}
                <p className="sf-price-note">Not listed on Google?</p>
                <button
                  className="sf-text-link"
                  type="button"
                  onClick={() => {
                    setManual(true);
                    setIntakeError("");
                    const next = {
                      ...brief,
                      googlePlaceId: undefined,
                      address: undefined,
                    };
                    setBrief(next);
                    saveBusinessBrief(next);
                  }}
                >
                  Business name, city, and state
                </button>
              </div>
            ) : (
              <>
                <label>
                  Business name
                  <input
                    name="businessName"
                    autoComplete="organization"
                    required
                    minLength={2}
                    maxLength={120}
                    value={brief.name}
                    onChange={(e) => change("name", e.target.value)}
                    placeholder="The name your customers know"
                  />
                </label>
                <label>
                  City & state
                  <input
                    name="businessCity"
                    required
                    minLength={2}
                    maxLength={120}
                    value={brief.city}
                    onChange={(e) => change("city", e.target.value)}
                    placeholder="e.g. Claremont, CA"
                  />
                </label>
                <button
                  type="button"
                  className="sf-text-link co-wide"
                  onClick={() => {
                    setManual(false);
                    setIntakeError("");
                  }}
                >
                  Search Google instead
                </button>
              </>
            )}
            {intakeError && (
              <p role="alert" className="sf-status co-wide">
                {intakeError}
              </p>
            )}
            {manual && (
              <>
                <label className="co-wide">
                  Website, social, or Google listing <span>(optional)</span>
                  <input
                    name="businessLink"
                    maxLength={300}
                    value={brief.link}
                    onChange={(e) => change("link", e.target.value)}
                    placeholder="Paste a link to help us find you"
                  />
                </label>
              </>
            )}
            <label className="co-wide">
              What should your hub help with?
              <select
                value={brief.goal}
                onChange={(e) => change("goal", e.target.value)}
              >
                <option>Reviews & customer connections</option>
                <option>Bookings & appointments</option>
                <option>Menu & orders</option>
                <option>Portfolio & social links</option>
                <option>A bit of everything</option>
              </select>
            </label>
          </fieldset>
          {loading && (
            <p role="status" className="sf-status">
              Checking current prices…
            </p>
          )}
          {failed && (
            <div role="alert" className="sf-status">
              We couldn't load prices.{" "}
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
          <fieldset disabled={busy} className="mt-7">
            <legend className="text-sm font-semibold mb-3">
              2. Your cards & billing
            </legend>
            <div className="sf-billing">
              {(["month", "year"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={interval === i}
                  onClick={() => onInterval(i)}
                >
                  {i === "month" ? (
                    "Monthly"
                  ) : (
                    <>
                      Yearly{" "}
                      <span className="sf-save-pill">Save with yearly</span>
                    </>
                  )}
                </button>
              ))}
            </div>
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
                        : "Currently unavailable"}
                    </small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <ul className="sf-checklist">
            {[
              "Custom NFC + QR cards",
              "Your business hub, designed and set up for you",
              "Free standard US shipping",
              "Dashboard, analytics, and ongoing support",
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
                Add business Card Club · {money(clubAmount)}/{interval}{" "}
                <span className="font-normal">(optional)</span>
              </strong>
              <small>
                Replacement cards for your business, with standard shipping
                included. Up to{" "}
                {plan ? CARD_QUANTITIES[plan] : "your plan's quantity of"} cards
                per eligible request. Your first paid invoice starts the waiting
                period; your dashboard shows when you can request. No rollover.
              </small>
              <small>
                Included in this order and the same renewal. One checkout.{" "}
                {interval === "year"
                  ? "$60 billed yearly with your plan."
                  : "$5 billed monthly with your plan."}
              </small>
            </span>
          </label>
        </section>
        <aside className="co-summary" aria-label="Order summary">
          <h2>Your business order</h2>
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
            <span>Business plan</span>
            <strong>
              {canCheckout ? formatCatalogPrice(item) : "Choose a plan"}
            </strong>
          </div>
          {club && (
            <div className="co-row">
              <span>Card Club</span>
              <strong>
                +{money(clubAmount)}/{interval}
              </strong>
            </div>
          )}
          <div className="co-row co-total">
            <div>
              <span>Due today</span>
              {trial > 0 && (
                <p className="sf-price-note">{trial}-day business trial</p>
              )}
            </div>
            <strong>
              {canCheckout ? (trial > 0 ? "$0" : money(total)) : "—"}
            </strong>
          </div>
          {canCheckout && (
            <p className="sf-price-note mt-3">
              {trial > 0
                ? `Then ${money(total)}/${interval}`
                : `${money(total)}/${interval}`}
              {club ? ", including Card Club" : ""}.{" "}
              {interval === "year"
                ? "The full annual amount is billed at renewal. "
                : ""}
              Renews until canceled.{" "}
              {trial > 0
                ? "Cancel before your trial ends to avoid the first charge."
                : ""}
            </p>
          )}
          {!loading &&
            !failed &&
            item?.available &&
            item.checkoutVersion !== 2 && (
              <div className="sf-status" role="status">
                This checkout is being updated. Please{" "}
                <button type="button" onClick={onRetry}>
                  try again
                </button>{" "}
                shortly, or <Link to="/support#question">contact our team</Link>
                .
              </div>
            )}
          {error && (
            <div className="sf-status" role="alert">
              {error}{" "}
              <Link className="underline" to="/support#question">
                Get help
              </Link>
            </div>
          )}
          <button
            className="sf-button w-full mt-6"
            disabled={!canCheckout || busy}
            type="submit"
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                Opening checkout…
              </>
            ) : (
              <>
                Start my business trial <ArrowRight />
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs flex items-center justify-center gap-2">
            <LockKeyhole className="h-3 w-3" />
            Secure Stripe checkout · No password first
          </p>
          <p className="sf-price-note mt-6">
            By continuing, you agree to the{" "}
            <Link to="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>
            .{" "}
            <Link to="/refund" className="underline">
              Refund policy
            </Link>
            . Canceling stops your next renewal.
          </p>
          <div className="border-t border-[#dce4d3] mt-6 pt-5">
            <h3 className="text-sm font-semibold">You're nearly done.</h3>
            <p className="sf-price-note mt-2">
              Enter payment and shipping once. We'll send your access link by
              email. You can add a logo afterward.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
