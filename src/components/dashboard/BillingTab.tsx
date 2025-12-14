import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard, Calendar, Crown, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export const BillingTab = ({ restaurant, isTestAccount, isGrandfathered }: BillingTabProps) => {
  const { toast } = useToast();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const openCustomerPortal = async () => {
    // If we already have a portal URL, use it
    if (restaurant?.stripe_portal_url) {
      window.open(restaurant.stripe_portal_url, "_blank");
      return;
    }

    // Otherwise, generate a new portal session
    if (!restaurant?.stripe_customer_id) {
      toast({
        title: "Portal unavailable",
        description: "Billing portal is not available. Contact support@tapaway.co for help.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: { customerId: restaurant.stripe_customer_id }
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to create billing portal');
      }

      window.open(data.url, "_blank");
    } catch (err: any) {
      console.error('Error creating billing portal:', err);
      toast({
        title: "Portal unavailable",
        description: "Could not open billing portal. Please try again or contact tap@tapaway.co",
        variant: "destructive",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  const planType = restaurant?.plan_type || 'standard';
  const planLabel = planType === 'monthly' ? 'Monthly Plan' : planType === 'yearly' ? 'Yearly Plan' : 'Standard Plan';
  const isBundle = planType === 'bundle';
  const isPrivateAccess = planType === 'private_access';
  const isAlwaysAllowed = isBundle || isPrivateAccess || isGrandfathered;
  const hasStripeSubscription = !!restaurant?.stripe_customer_id;

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-primary" />
          Billing & Subscription
        </h2>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      {isGrandfathered && (
        <Card className="p-6 gradient-subtle border-none">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Grandfathered Plan</h3>
              <p className="text-muted-foreground mb-4">Your account has special grandfathered access with billing managed directly by TapAway.</p>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> Active (Lifetime Access)</p>
                <p><strong>Billing:</strong> Managed Manually</p>
                <p className="text-muted-foreground mt-3">Questions? Email <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">tap@tapaway.co</a></p>
              </div>
              {hasStripeSubscription && (
                <Button onClick={openCustomerPortal} className="mt-4" disabled={loadingPortal}>
                  {loadingPortal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isGrandfathered && isBundle && (
        <Card className="p-6 gradient-subtle border-none">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Multi-Location Bundle Plan</h3>
              <p className="text-muted-foreground mb-4">Your locations are part of a bundle with billing managed directly by TapAway.</p>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> Active</p>
                <p><strong>Billing:</strong> Managed Directly with TapAway</p>
                <p className="text-muted-foreground mt-3">Questions? Email <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">tap@tapaway.co</a></p>
              </div>
              {hasStripeSubscription && (
                <Button onClick={openCustomerPortal} className="mt-4" disabled={loadingPortal}>
                  {loadingPortal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isGrandfathered && isPrivateAccess && (
        <Card className="p-6 gradient-subtle border-none">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Private Access Plan</h3>
              <p className="text-muted-foreground mb-4">Your billing is handled manually by TapAway.</p>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> Active</p>
                <p><strong>Billing:</strong> Custom Arrangement</p>
                <p className="text-muted-foreground mt-3">Questions? Email <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">tap@tapaway.co</a></p>
              </div>
              {hasStripeSubscription && (
                <Button onClick={openCustomerPortal} className="mt-4" disabled={loadingPortal}>
                  {loadingPortal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isAlwaysAllowed && isTestAccount && (
        <Card className="p-6 bg-primary/5 border-primary">
          <div className="flex items-start gap-3">
            <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Account</h3>
              <p className="text-sm text-muted-foreground">This is a test account for demonstration purposes.</p>
            </div>
          </div>
        </Card>
      )}

      {!isAlwaysAllowed && !isTestAccount && hasStripeSubscription && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold mb-1">Current Plan</h3>
                <p className="text-muted-foreground text-sm">{planLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize text-green-600">{restaurant?.subscription_status || 'Active'}</p>
              </div>
            </div>
            {restaurant?.next_billing_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next billing:</span>
                <span className="font-medium">{new Date(restaurant.next_billing_date).toLocaleDateString()}</span>
              </div>
            )}
            <Button onClick={openCustomerPortal} className="w-full" disabled={loadingPortal}>
              {loadingPortal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {!isAlwaysAllowed && !isTestAccount && !hasStripeSubscription && (
        <Card className="p-6 gradient-subtle border-none">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Subscription Active</h3>
              <p className="text-muted-foreground mb-4">Your TapAway subscription is active and your billing is managed through Stripe.</p>
              <div className="text-sm space-y-1">
                <p><strong>Status:</strong> <span className="text-green-600">Active</span></p>
                <p><strong>Plan:</strong> {planLabel}</p>
                <p className="text-muted-foreground mt-3">Need help with billing? Email <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">tap@tapaway.co</a></p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
