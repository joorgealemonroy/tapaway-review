import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, CreditCard, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Restaurant {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_portal_url: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  next_billing_date: string | null;
}

const Billing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("restaurants")
      .select("id, stripe_customer_id, stripe_subscription_id, stripe_portal_url, subscription_status, plan_type, next_billing_date")
      .eq("owner_id", user.id)
      .single();

    if (!data) {
      navigate("/onboarding");
      return;
    }

    setRestaurant(data);
    setLoading(false);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Billing</h1>
            <p className="text-muted-foreground mt-1">Manage your subscription and billing information</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
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
                  <h2 className="text-xl font-semibold mb-2">Next Billing Date</h2>
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
            <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
            <p className="text-muted-foreground mb-6">
              Update your payment method, view invoices, or change your plan through the Stripe customer portal.
            </p>
            <Button onClick={openCustomerPortal} disabled={!restaurant?.stripe_portal_url}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Customer Portal
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about billing or need to make changes to your account, contact our support team.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:support@tapaway.co">
                Contact Support
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;
