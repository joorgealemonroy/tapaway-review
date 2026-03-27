import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Crown, Sparkles, ExternalLink } from "lucide-react";
import { PERSONAL_PLANS, isPaidPlan, isVIPPlan, isFoundingPlan } from "@/lib/personalPlanLimits";

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
  const isFounding = isFoundingPlan(profile.plan_type);
  const isPro = isPaidPlan(profile.plan_type) || isVIPPlan(profile.plan_type) || isFounding;
  const isTrialing = profile.subscription_status === 'trialing' && !!profile.trial_ends_at;
  const trialEndDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialDaysLeft = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  
  const planInfo = isVIPPlan(profile.plan_type) || isFounding
    ? PERSONAL_PLANS.vip 
    : PERSONAL_PLANS.paid;
  
  const isVIP = isVIPPlan(profile.plan_type) || isFounding || (isPaidPlan(profile.plan_type) && !profile.stripe_subscription_id);

  const billingEmail = profile.stripe_billing_email || profile.email;
  const hasBillingEmail = !isVIP && isPro && !!billingEmail;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPro ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5" />}
                Current Plan
              </CardTitle>
              <CardDescription>
                {isVIP 
                  ? "" 
                  : isPro 
                    ? "You have access to all premium features" 
                    : "Upgrade to unlock premium features"}
              </CardDescription>
            </div>
            <Badge variant="default" className={isVIP ? "bg-emerald-500" : isTrialing ? "bg-blue-500" : isPro ? "bg-amber-500" : ""}>
              {isVIP ? "VIP Access" : isTrialing ? "Pro Trial" : planInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialing ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">Free Trial</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                ⏳ {trialDaysLeft} days left — your trial ends {trialEndDate?.toLocaleDateString()}. Then $15/month.
              </p>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{planInfo.price}</span>
              <span className="text-muted-foreground">{planInfo.priceSubtext}</span>
            </div>
          )}


          {isPro && !isVIP && !isTrialing && profile.subscription_status === "active" && (
            <p className="text-sm text-muted-foreground">
              Your subscription is active. Manage billing details through the Stripe portal.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {isPro ? (
              <>
                {!isVIP && (
                  <div className="w-full space-y-3">
                    {hasBillingEmail && (
                      <p className="text-sm text-muted-foreground">
                        Billing email on file: {maskEmail(billingEmail!)}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => window.open(STRIPE_PORTAL_URL, "_blank")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Subscription
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Button onClick={onUpgrade}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}