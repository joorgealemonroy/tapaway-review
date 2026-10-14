import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAppSettings } from "@/lib/appSettings";
import { getCampaignParams, getOnboardingData, saveOnboardingData } from "@/lib/onboardingData";
import { CARD_QUANTITIES, formatCatalogPrice, useOnboardingCatalog, type BillingInterval, type OnboardingPlan } from "@/lib/onboardingCatalog";

export function PricingSection() {
  const { catalog, loading, failed, retry } = useOnboardingCatalog();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(location.search);
    const explicit = params.get("billing") || params.get("billing_interval");
    const saved = getOnboardingData();
    if (explicit === "year" || explicit === "month") setInterval(explicit);
    else if (saved.billingInterval) setInterval(saved.billingInterval);
    else getAppSettings(supabase).then((settings) => { if (active) setInterval(settings.onboardingDefaultBilling); });
    return () => { active = false; };
  }, [location.search]);
  const choose = (plan: OnboardingPlan) => {
    const item = catalog.find((value) => value.plan === plan && value.interval === interval);
    if (!item?.available) return;
    const saved = getOnboardingData();
    saveOnboardingData({ planType: plan, billingInterval: interval, billingSelectionExplicit: true, hasProtection: false,
      dashboardType: plan === "solo" ? "personal" : "restaurant", campaign: { ...saved.campaign, ...getCampaignParams() } });
    const params = new URLSearchParams(location.search);
    params.set("plan", plan);
    params.set("billing", interval);
    navigate(`/start?${params.toString()}`);
  };
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-20 border-y border-border bg-background px-4 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div><h2 id="pricing-heading" className="text-3xl font-black md:text-4xl">Choose your cards</h2><p className="mt-3 text-muted-foreground">Custom cards and a business hub, set up for you.</p></div>
          <div className="flex gap-1 rounded-md border border-border bg-secondary p-1" aria-label="Pricing billing interval">
            {(["year", "month"] as const).map((value) => <Button key={value} variant={interval === value ? "default" : "ghost"} aria-pressed={interval === value} onClick={() => { setInterval(value); saveOnboardingData({ billingInterval: value, billingSelectionExplicit: true }); }}>{value === "year" ? "Yearly" : "Monthly"}</Button>)}
          </div>
        </div>
        {loading && <p role="status" className="mb-4 text-muted-foreground">Checking current prices…</p>}
        {failed && <p role="status" className="mb-4 text-muted-foreground">Prices are temporarily unavailable. <Button variant="link" onClick={retry}>Try again</Button></p>}
        {!loading && interval === "year" && catalog.some((item) => item.interval === "year" && !item.available) && <p className="mb-4 text-muted-foreground">Yearly is temporarily unavailable for some options. <Button variant="link" onClick={() => { setInterval("month"); saveOnboardingData({ billingInterval: "month", billingSelectionExplicit: true }); }}>Choose monthly</Button></p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {(["solo", "venue"] as const).map((plan) => {
            const item = catalog.find((value) => value.plan === plan && value.interval === interval);
            const monthly = catalog.find((value) => value.plan === plan && value.interval === "month");
            const annual = catalog.find((value) => value.plan === plan && value.interval === "year");
            const savings = monthly?.available && annual?.available ? (monthly.amount * 12 - annual.amount) / 100 : null;
            return <article key={plan} className="flex flex-col rounded-lg border border-border bg-secondary p-5">
              <div className="flex items-center gap-4"><img src="/tapaway-card-front-v2.svg" alt="TapAway NFC and QR card" className="w-16 shrink-0 aspect-[53.98/85.6] object-contain" /><div><h3 className="text-3xl font-black">{CARD_QUANTITIES[plan]} cards</h3><p className="mt-2 text-sm text-foreground">Your logo. Your business links.</p><p className="text-sm text-muted-foreground">Ready to tap or scan.</p></div></div>
              <div className="my-4 border-t border-border pt-4"><p className="text-3xl font-bold">{loading ? "Checking…" : formatCatalogPrice(item)}</p>
                {item?.available && <><p className="mt-2 text-sm text-muted-foreground">Billed {interval === "year" ? "annually" : "monthly"} after your {item.trialDays}-day trial.</p>{interval === "year" && <p className="mt-1 text-sm text-muted-foreground">Equivalent to ${(item.amount / 1200).toFixed(2)}/month, billed yearly.</p>}{interval === "year" && savings !== null && savings > 0 && <p className="mt-2 font-semibold text-primary">Save ${savings}/year compared with monthly</p>}</>}
              </div>
              <Button className="mt-auto h-12" disabled={loading || item?.available !== true} onClick={() => choose(plan)}>Continue with {CARD_QUANTITIES[plan]} cards <ArrowRight className="h-4 w-4" /></Button>
              {item?.available && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Renews {interval === "year" ? "yearly" : "monthly"} until canceled. Cancel before your trial ends to avoid the first subscription charge.</p>}
            </article>;
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">{["Custom business hub", "Done-for-you setup", "Free US shipping"].map((benefit) => <span key={benefit} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{benefit}</span>)}</div>
        <p className="mt-4 text-sm text-muted-foreground">Card on file required. Temporary $1 verification authorization, not a subscription charge. Bank release times vary.</p>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><Link to="/terms" className="underline">Terms</Link><Link to="/refund" className="underline">Refund Policy</Link></div>
      </div>
    </section>
  );
}