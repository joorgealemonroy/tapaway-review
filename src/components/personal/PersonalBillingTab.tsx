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
  const isGrandfathered = profile.plan_type === 'vip' || profile.plan_type === 'founding_pro';
  const isAnnual = profile.plan_type === 'yearly';
  const isTrialing = profile.subscription_status === 'trialing' && !!profile.trial_ends_at;
  const trialEndDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialDaysLeft = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const hasSubscription = !!profile.stripe_subscription_id;
  const billingEmail = profile.stripe_billing_email || profile.email;

  const displayPrice = isAnnual ? "$150" : "$15";
  const displayInterval = isAnnual ? "/year" : "/month";

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
                    : "You have access to all premium features"}
              </CardDescription>
            </div>
            <Badge variant="default" className={isGrandfathered ? "bg-emerald-500" : isTrialing ? "bg-blue-500" : "bg-amber-500"}>
              {isGrandfathered ? "VIP Access" : isTrialing ? "Pro Trial" : "Business"}
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
                    onClick={() => window.open(STRIPE_PORTAL_URL, "_blank")}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={onUpgrade}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set up Billing
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
