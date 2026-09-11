import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, CreditCard, Truck, Headphones, Shield, Info, ArrowRight, Sparkles } from "lucide-react";
import { usePaywallGuard } from "./PaywallGuard";
import { motion } from "framer-motion";
import { TRIAL_URL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { getTrybeVisitorId } from "@/lib/trybePixel";

const Paywall = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const claimRestaurantId = searchParams.get('restaurant') || searchParams.get('claim');
  const [loading, setLoading] = useState(false);
  const { checking } = usePaywallGuard();

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleContinueToCheckout = async () => {
    // Set local flags for trial intent
    const timestamp = Date.now().toString();
    localStorage.setItem('tapaway_trial_intent', 'true');
    localStorage.setItem('tapaway_trial_started_at', timestamp);
    localStorage.setItem('tapaway_pending_setup', 'true');

    document.cookie = `tapaway_trial_intent=true; path=/; max-age=604800`;
    document.cookie = `tapaway_trial_started_at=${timestamp}; path=/; max-age=604800`;
    document.cookie = `tapaway_pending_setup=true; path=/; max-age=604800`;

    // If claiming a rep-created demo hub, generate a dynamic checkout session
    // so the webhook can reassign ownership via claim_restaurant_id metadata.
    if (claimRestaurantId) {
      try {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email;
        if (!email) {
          toast({
            title: "Please sign in",
            description: "You need an account to claim this hub.",
            variant: "destructive",
          });
          navigate(`/auth?next=/paywall?restaurant=${claimRestaurantId}`);
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            email,
            userId: userData!.user!.id,
            planType: 'solo',
            claimRestaurantId,
            dashboardType: 'restaurant',
            trybeVisitorId: getTrybeVisitorId(),
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error('No checkout URL returned');
      } catch (err) {
        console.error('[Paywall] Dynamic checkout failed:', err);
        toast({
          title: "Checkout unavailable",
          description: "We couldn't start checkout. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    // Default: static trial payment link
    window.location.href = TRIAL_URL;
  };

  const benefits = [
    { icon: CreditCard, text: "Free custom NFC cards (logo optional)" },
    { icon: Truck, text: "Ships in 1–2 business days" },
    { icon: Sparkles, text: "Done-for-you setup" },
    { icon: Headphones, text: "Full tracking & support" },
    { icon: Shield, text: "Cancel anytime during the trial" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">TapAway</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm">
            Already have an account?
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-4 py-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Canceled Banner */}
          {canceled && (
            <Card className="p-4 bg-amber-50 border-amber-200 text-amber-800">
              <p className="text-sm font-medium text-center">
                Checkout canceled. Ready to try again when you are!
              </p>
            </Card>
          )}

          {/* Headline */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Start Your Free 14-Day TapAway Trial
            </h1>
            <p className="text-muted-foreground text-lg">
              We'll install everything for you. You won't be charged today.
            </p>
          </div>

          {/* Offer Recap Card */}
          <Card className="p-6 bg-muted/30 border-border/50">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-background rounded-lg border border-border/50">
                <p className="text-2xl font-black text-primary">$0</p>
                <p className="text-xs text-muted-foreground">Due today</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg border border-border/50">
                <p className="text-2xl font-black">14 days</p>
                <p className="text-xs text-muted-foreground">Free trial</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
              What's included
            </p>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{benefit.text}</span>
                </motion.li>
              ))}
            </ul>
          </Card>

          {/* CTA Card */}
          <Card className="p-6 md:p-8 shadow-lg border-border">
            <div className="space-y-6">
              {/* Sanity check note */}
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  You'll see <span className="font-semibold text-foreground">$0 due today</span> and a 14-day free trial at checkout.
                </p>
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleContinueToCheckout}
                disabled={loading}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                {loading ? "Preparing checkout..." : (claimRestaurantId ? "Unlock My Hub" : "Continue to Secure Checkout")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {/* Under CTA */}
              <p className="text-xs text-center text-muted-foreground">
                No charge today • Cancel anytime before day 14
              </p>

              {/* Post-trial pricing */}
              <div className="text-center pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  After the trial: <span className="font-semibold text-foreground">$20/month</span> or{" "}
                  <span className="font-semibold text-foreground">$199/year (save $41)</span>. No contracts.
                </p>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground pt-2">
                By continuing, you agree to our{" "}
                <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
                <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
              </p>
            </div>
          </Card>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" />
              <span>Personal support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
