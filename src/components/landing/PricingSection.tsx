import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { saveOnboardingData } from "@/lib/onboardingData";
import {
  CARD_QUANTITIES,
  useOnboardingCatalog,
  type BillingInterval,
  type OnboardingPlan,
} from "@/lib/onboardingCatalog";
import {
  selectStorefrontPlan,
  type StorefrontAudience,
} from "@/lib/storefront";
import { HalloweenCountdown } from "./SeasonalOffer";
import { StorefrontLink, prefetchStorefrontRoute } from "@/lib/storefrontNavigation";
import { track } from "@/lib/analytics";

export function PricingSection({
  audience = "business",
}: {
  audience?: StorefrontAudience;
}) {
  const { catalog, loading, failed, retry } = useOnboardingCatalog();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const explicit = params.get("billing") || params.get("billing_interval") || params.get("cycle");
    setInterval(explicit === "year" ? "year" : "month");
  }, [location.search]);
  const choose = (plan: OnboardingPlan) => {
    if (
      loading ||
      catalog.find(
        (value) => value.plan === plan && value.interval === interval,
      )?.available !== true
    )
      return;
    track("landing_cta_clicked", {
      hubKind: "site",
      props: { placement: "pricing", plan, interval, audience },
    });
    navigate(selectStorefrontPlan(plan, interval, location.search, audience));
  };
  const plans: OnboardingPlan[] =
    audience === "personal" ? ["solo"] : ["solo", "venue"];
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="sf-section sf-container"
    >
      <div className="sf-personal-pricing-callout" aria-label="TapAway Personal pricing">
        <div>
          <p className="sf-eyebrow">TapAway personal · One-time purchase</p>
          <h2>Two custom cards. <strong>$39 once.</strong></h2>
          <p>Design both sides. Free US shipping. Use your own link with no subscription, or add a TapAway hub for $5/month.</p>
          <HalloweenCountdown />
        </div>
        <StorefrontLink className="sf-button" to="/personal/design">Design my 2 cards <ArrowRight /></StorefrontLink>
      </div>
      <div className="sf-price-header">
        <div>
          <p className="sf-eyebrow">TapAway business · Cards + hub subscription</p>
          <h2 id="pricing-heading" className="sf-title">
            {audience === "personal"
              ? "Your cards. Your hub. One plan."
              : "Pick your cards. We'll do the rest."}
          </h2>
          <p className="sf-copy mt-4 text-sm">
            {audience === "personal"
              ? "Start with 4 custom cards and a personal hub. This is a subscription plan."
              : "One hub for your business, with the number of cards you need."}
          </p>
        </div>
        <div className="sf-billing" aria-label="Pricing billing interval">
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={interval === value}
              onClick={() => {
                setInterval(value);
                saveOnboardingData({
                  billingInterval: value,
                  billingSelectionExplicit: true,
                });
              }}
            >
              {value === "year" ? <>Yearly <span className="sf-save-pill">Save with yearly</span></> : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <p role="status" className="sf-status">
          Checking current prices…
        </p>
      )}
      {failed && (
        <div role="status" className="sf-status">
          We couldn't load current prices.
          <button onClick={retry}>Try again</button> or{" "}
          <Link to="/support#question" className="underline">
            ask us for help
          </Link>
          .
        </div>
      )}
      {!loading &&
        !failed &&
        plans.some(
          (plan) =>
            !catalog.find((i) => i.plan === plan && i.interval === interval)
              ?.available,
        ) && (
          <p className="sf-status">
            Some options are temporarily unavailable. Try the other billing
            interval or contact us.
          </p>
        )}
      <div className={`sf-price-grid ${plans.length === 1 ? "single" : ""}`}>
        {plans.map((plan) => {
          const item = catalog.find(
            (value) => value.plan === plan && value.interval === interval,
          );
          const monthly = catalog.find(
            (value) => value.plan === plan && value.interval === "month",
          );
          const annual = catalog.find(
            (value) => value.plan === plan && value.interval === "year",
          );
          const savings =
            monthly?.available && annual?.available
              ? (monthly.amount * 12 - annual.amount) / 100
              : 0;
          return (
            <article
              key={plan}
              className={`sf-price-card ${plan === "venue" ? "featured" : ""}`}
            >
              <h3>{CARD_QUANTITIES[plan]} custom cards</h3>
              <p className="description">
                {plan === "solo"
                  ? "For your business counter, kit or team."
                  : "For more tables, team members and touchpoints."}
              </p>
              <p className="sf-price-tag">
                {loading ? (
                  "Checking…"
                ) : item?.available ? (
                  <>
                    {`$${(item.amount / 100).toLocaleString("en-US")}`}
                    <small> / {interval === "year" ? "year" : "month"}</small>
                  </>
                ) : (
                  "Unavailable"
                )}
              </p>
              {item?.available && (
                <>
                  <p className="sf-price-note">
                    {item.trialDays > 0
                      ? `After your ${item.trialDays}-day free trial.`
                      : "Billed at checkout."}{" "}
                    {interval === "year"
                      ? "Billed annually."
                      : "Billed monthly."}
                  </p>
                  {interval === "year" && (
                    <p className="sf-price-note">
                      Equivalent to ${(item.amount / 1200).toFixed(2)}/month.
                    </p>
                  )}
                  {interval === "year" && savings > 0 && (
                    <p className="sf-saving">
                      Save ${savings} a year compared with monthly
                    </p>
                  )}
                </>
              )}
              <ul className="sf-checklist">
                {[
                  `${CARD_QUANTITIES[plan]} NFC + QR cards with your design`,
                  "Your own customizable digital hub",
                  "Done-for-you design and setup",
                  "Tap and link activity in your dashboard",
                  "Free standard US shipping",
                  "Ongoing support from our team",
                ].map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className="sf-button"
                disabled={loading || item?.available !== true}
                onMouseEnter={() => prefetchStorefrontRoute("/onboarding")}
                onFocus={() => prefetchStorefrontRoute("/onboarding")}
                onTouchStart={() => prefetchStorefrontRoute("/onboarding")}
                onClick={() => choose(plan)}
              >
                Get my {CARD_QUANTITIES[plan]} cards <ArrowRight />
              </button>
              {item?.available && (
                <p className="terms">
                  {item.trialDays > 0
                    ? "Cancel before your trial ends to avoid the first subscription charge. "
                    : ""}
                  Renews {interval === "year" ? "yearly" : "monthly"} until
                  canceled.{" "}
                  {interval === "year"
                    ? "The full annual amount is billed, not the monthly equivalent."
                    : ""}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="sf-pricing-foot">
        <p>
          Optional business Card Club is included in the same checkout and renewal. New plans do not include
          free monthly replacement cards by default.
        </p>
        <p className="mt-2">
          <Link to="/terms" className="underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/refund" className="underline">
            Refund policy
          </Link>{" "}
          ·{" "}
          <Link to="/support#question" className="underline">
            More locations or a custom order? Talk to us.
          </Link>
        </p>
      </div>
    </section>
  );
}
