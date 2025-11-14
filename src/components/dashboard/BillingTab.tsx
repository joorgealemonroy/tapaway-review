import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BillingTabProps {
  restaurant: {
    stripe_portal_url: string | null;
    subscription_status: string | null;
    plan_type: string | null;
    next_billing_date: string | null;
    custom_slug: string | null;
    type?: string | null;
  };
  isTestAccount: boolean;
}

export const BillingTab = ({ restaurant, isTestAccount }: BillingTabProps) => {
  const { toast } = useToast();

  const openCustomerPortal = () => {
    if (restaurant?.stripe_portal_url) {
      window.open(restaurant.stripe_portal_url, "_blank");
    } else {
      toast({
        title: "Portal unavailable",
        description: "Customer portal is not set up yet.",
        variant: "destructive",
      });
    }
  };

  // AV Meal Prep legacy plan
  if (restaurant?.custom_slug === 'avmealpreps' || restaurant?.type === 'meal_prep') {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-primary/5 border-primary">
          <div className="flex items-start gap-3">
            <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">AV Meal Prep Legacy Plan</h3>
              <p className="text-sm text-muted-foreground mb-3">
                You're on a special grandfathered plan with full access to all TapAway features.
              </p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-semibold">Plan:</span> Legacy ($10/month)</p>
                <p className="text-sm"><span className="font-semibold">Billing:</span> Managed manually by TapAway</p>
                <p className="text-sm"><span className="font-semibold">Status:</span> Active</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Need Help?</h3>
          <p className="text-muted-foreground mb-4">
            If you have questions about your plan or need assistance, contact our support team.
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:tap@tapaway.co">
              Contact Support
            </a>
          </Button>
        </Card>
      </div>
    );
  }

  if (isTestAccount) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-primary/5 border-primary">
          <div className="flex items-start gap-3">
            <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Account</h3>
              <p className="text-sm text-muted-foreground">
                This is a test account with unlimited access. No billing is required.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Current Plan</h3>
            <p className="text-2xl font-bold text-primary mb-1">
              {restaurant?.plan_type || "Free Plan"}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: <span className="capitalize">{restaurant?.subscription_status || "active"}</span>
            </p>
          </div>
          <CreditCard className="w-8 h-8 text-muted-foreground" />
        </div>
      </Card>

      {restaurant?.next_billing_date && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Next Billing Date</h3>
              <p className="text-lg">
                {new Date(restaurant.next_billing_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Manage Subscription</h3>
        <p className="text-muted-foreground mb-6">
          Update your payment method, view invoices, or change your plan through the Stripe customer portal.
        </p>
        <Button onClick={openCustomerPortal} disabled={!restaurant?.stripe_portal_url}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Customer Portal
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Need Help?</h3>
        <p className="text-muted-foreground mb-4">
          If you have questions about billing or need to make changes to your account, contact our support team.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:tap@tapaway.co">
            Contact Support
          </a>
        </Button>
      </Card>
    </div>
  );
};