import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard, Calendar, Crown, Building2, CheckCircle2, Sparkles, Clock } from "lucide-react";

interface BillingTabProps {
  restaurant: {
    id?: string;
    stripe_customer_id?: string | null;
    stripe_portal_url: string | null;
    subscription_status: string | null;
    plan_type: string | null;
    next_billing_date: string | null;
    custom_slug: string | null;
    type?: string | null;
  };
  isTestAccount: boolean;
  isGrandfathered?: boolean;
}

const STRIPE_BILLING_PORTAL_URL = "https://billing.stripe.com/p/login/bJe9AT3dJe5Z31vbaOgYU00";

export const BillingTab = ({ restaurant, isTestAccount, isGrandfathered }: BillingTabProps) => {
  const openCustomerPortal = () => {
    window.open(STRIPE_BILLING_PORTAL_URL, "_blank");
  };

  const planType = restaurant?.plan_type || 'standard';
  const planLabel = planType === 'monthly' ? 'Monthly Plan'
    : planType === 'yearly' ? 'Yearly Plan'
    : planType === 'solo' ? 'TapAway Solo (Monthly)'
    : planType === 'solo_yearly' ? 'TapAway Solo (Yearly)'
    : planType === 'venue' ? 'TapAway Pro (Monthly)'
    : planType === 'venue_yearly' ? 'TapAway Pro (Yearly)'
    : 'Standard Plan';
  const isBundle = planType === 'bundle';
  const isPrivateAccess = planType === 'private_access';
  const isTrialing = restaurant?.subscription_status === 'trialing';
  const isAlwaysAllowed = isBundle || isPrivateAccess || isGrandfathered;

  return (
    <div className="space-y-8 pb-8 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          Billing & Subscription
        </h2>
        <p className="text-muted-foreground ml-12">Manage your subscription and billing</p>
      </div>

      {/* Status Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isGrandfathered ? (
                <Crown className="w-8 h-8" />
              ) : isBundle ? (
                <Building2 className="w-8 h-8" />
              ) : isPrivateAccess ? (
                <Sparkles className="w-8 h-8" />
              ) : isTrialing ? (
                <Clock className="w-8 h-8" />
              ) : (
                <CreditCard className="w-8 h-8" />
              )}
              <div>
                <h3 className="text-xl font-bold">
                  {isGrandfathered ? 'Grandfathered Plan' : 
                   isBundle ? 'Multi-Location Bundle' : 
                   isPrivateAccess ? 'Private Access' : 
                   isTrialing ? 'Free Trial' :
                   isTestAccount ? 'Test Account' : planLabel}
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  {isGrandfathered ? 'Lifetime Access' : 
                   isBundle ? 'Bundle Pricing' : 
                   isPrivateAccess ? 'Custom Arrangement' :
                   isTrialing ? 'Trial Period' :
                   isTestAccount ? 'Demo Purposes' : 'TapAway Subscription'}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 ${isTrialing ? 'bg-blue-500/80' : 'bg-white/20'}`}>
              {isTrialing ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="font-semibold">{isTrialing ? 'Trial' : 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6 bg-card">
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Plan Type</p>
              <p className="font-semibold text-foreground">
                {isGrandfathered ? 'Legacy Access' : 
                 isBundle ? 'Bundle' : 
                 isPrivateAccess ? 'Private' : 
                 isTrialing ? 'Trial → Monthly' :
                 isTestAccount ? 'Test' : planLabel}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Billing</p>
              <p className="font-semibold text-foreground">
                {isGrandfathered || isBundle || isPrivateAccess ? 'Managed by TapAway' : 'Via Stripe'}
              </p>
            </div>
          </div>

          {/* Trial Message */}
          {isTrialing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Clock className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Your trial is active — you'll be moved to a paid plan soon.
              </p>
            </div>
          )}

          {/* Next Billing Date - only for standard subscriptions */}
          {!isAlwaysAllowed && !isTrialing && !isTestAccount && restaurant?.next_billing_date && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Next billing date</p>
                <p className="font-semibold">{new Date(restaurant.next_billing_date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={openCustomerPortal} 
              className="flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Manage Subscription
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground">
            Need help? Email{' '}
            <a href="mailto:tap@tapaway.co" className="text-primary hover:underline font-medium">
              tap@tapaway.co
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};
