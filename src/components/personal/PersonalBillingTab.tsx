import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Crown, Sparkles, ExternalLink } from "lucide-react";

const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/bJe9AT3dJe5Z31vbaOgYU00";

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const maskedLocal = local.length <= 2
    ? "**"
    : `${local.substring(0, 2)}${"*".repeat(Math.max(2, local.length - 3))}${local.slice(-1)}`;
  const parts = domain.split(".");
  const tld = parts.pop() || "";
  const maskedDomain = parts.map(p => "*".repeat(p.length)).join(".") + "." + tld;
  return `${maskedLocal}@${maskedDomain}`;
};

interface PersonalBillingTabProps {
  profile: {
    id: string;
    onboarding_source?: string | null;
    plan_type: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at?: string | null;
    stripe_billing_email?: string | null;
    email?: string;
  };
  onUpgrade: () => void;
  onPlanChange: () => void;
}

export function PersonalBillingTab({ profile, onUpgrade }: PersonalBillingTabProps) {
  const [opening, setOpening] = useState(false);
  const paymentFirst = profile.onboarding_source?.startsWith("payment_first") || false;
  const personalHosted = profile.plan_type === "personal_hosted";
  const openBilling = async () => {
    if (!personalHosted && !paymentFirst) { window.open(STRIPE_PORTAL_URL, "_blank", "noopener,noreferrer"); return; }
    setOpening(true);
    try { const { data, error } = await supabase.functions.invoke("manage-personal-subscription", { body: { action: "portal", profileId: profile.id } }); if (error || !data?.url) throw new Error(); window.location.assign(data.url); }
    catch { toast.error("Couldn't open billing. Try again or contact tap@tapaway.co."); }
    finally { setOpening(false); }
  };
  const isGrandfathered = profile.plan_type === 'vip' || profile.plan_type === 'founding_pro';
  const isAnnual = profile.plan_type === 'yearly';
  const isTrialing = profile.subscription_status === 'trialing' && !!profile.trial_ends_at;
  const trialEndDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialDaysLeft = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const hasSubscription = !!profile.stripe_subscription_id;
  const billingEmail = profile.stripe_billing_email || profile.email;

  const getPriceDisplay = () => {
    if (personalHosted) return { price: "$5", interval: "/month" };
    if (isAnnual) return { price: "$199", interval: "/year" };
    if (profile.plan_type === 'plus_monthly') return { price: "$25", interval: "/month" };
    return { price: "$20", interval: "/month" };
  };
  const { price: displayPrice, interval: displayInterval } = getPriceDisplay();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isGrandfathered ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5" />}
                Current Plan
              </CardTitle>
              <CardDescription>
                {isGrandfathered
                  ? "You have lifetime access to all premium features"
                  : isTrialing
                    ? "Your trial is active"
                    : personalHosted ? "Your optional personal hub and analytics. Your cards were a separate one-time purchase." : "You have access to all premium features"}
              </CardDescription>
            </div>
            <Badge variant="default" className={isGrandfathered ? "bg-emerald-500" : isTrialing ? "bg-blue-500" : "bg-amber-500"}>
              {personalHosted ? "Personal hub" : isGrandfathered ? "VIP Access" : isTrialing ? "Pro Trial" : "Business"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentFirst ? <div><p className="text-xl font-semibold">{profile.subscription_status === "trialing" ? "Your business trial is active" : "Your business subscription"}</p><p className="text-sm text-muted-foreground mt-2">Open billing for your exact renewal total, trial end date, and invoices. Your Cards tab shows your Card Club selection and eligibility.</p></div> : isTrialing ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">Free Trial</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                ⏳ {trialDaysLeft} days left. Your trial ends {trialEndDate?.toLocaleDateString()}. Then {isAnnual ? "$199/year" : "$20/month"}.
              </p>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{isGrandfathered ? "$0" : displayPrice}</span>
              <span className="text-muted-foreground">{isGrandfathered ? "forever" : displayInterval}</span>
            </div>
          )}

          {!isGrandfathered && !isTrialing && profile.subscription_status === "active" && (
            <p className="text-sm text-muted-foreground">
              Your subscription is active. Manage billing details through the Stripe portal.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {isGrandfathered ? null : (
              <div className="w-full space-y-3">
                {!isTrialing && hasSubscription && billingEmail && (
                  <p className="text-sm text-muted-foreground">
                    Billing email on file: {maskEmail(billingEmail)}
                  </p>
                )}
                {hasSubscription ? (
                  <Button
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={opening} onClick={openBilling}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={onUpgrade} className="min-h-[44px]">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set up Billing
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isTrialing && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Card Club. Unlocks with any paid plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Once you activate, add the Card Club at checkout for $5/mo and get up to 3 NFC cards shipped monthly, free shipping included.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isTrialing && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Your trial terms</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li>
                Your free trial ends on{" "}
                <span className="font-medium text-foreground">
                  {trialEndDate?.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </span>{" "}
                ({trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left).
              </li>
              <li>
                When the trial ends, your hub is billed <span className="font-medium text-foreground">{isAnnual ? "$199/year" : "$20/month"}</span>{" "}
                unless you cancel first. You can cancel any time before the end date at no charge.
              </li>
              <li>
                If no payment method is added, your hub is deactivated at the end of the trial and its public link
                stops resolving. Your content is retained for 30 days so you can reactivate.
              </li>
              <li>
                Any NFC cards, stands or other hardware provided during the trial{" "}
                <span className="font-medium text-foreground">remain the property of TapAway</span> until a paid plan
                is active, and must be returned or paid for on request if you do not activate.
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
