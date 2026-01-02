import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, CreditCard, Truck, Headphones, BarChart3, Sparkles, Info, Shield } from "lucide-react";
import { usePaywallGuard } from "./PaywallGuard";
import { motion } from "framer-motion";
import { TRIAL_URL } from "@/lib/constants";

const Paywall = () => {
  const navigate = useNavigate();
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

  const topBenefits = [
    { icon: CreditCard, text: "Free custom NFC cards (logo optional)" },
    { icon: Truck, text: "Ships in 1–2 business days" },
    { icon: BarChart3, text: "Review + social hub included" },
    { icon: Headphones, text: "Full tracking & support" },
    { icon: Shield, text: "Cancel anytime during the trial" },
  ];

  const inlineBenefits = [
    "Custom NFC cards (logo optional)",
    "Ships in 1–2 business days",
    "Review + social hub",
    "Full tracking & support",
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
          {/* Headline */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Start Your Free 30-Day TapAway Trial
            </h1>
            <p className="text-muted-foreground text-lg">
              We'll install everything for you. You won't be charged today.
            </p>
          </div>

          {/* Value Checklist */}
          <Card className="p-6 bg-muted/30 border-border/50">
            <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
              What's included
            </p>
            <ul className="space-y-3">
              {topBenefits.map((benefit, index) => (
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
              {/* Inline Benefits */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Included in your free trial
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  {inlineBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs">
                      <Check className="w-3 h-3 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Section */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    Payment Method
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (for after your free trial)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  You won't be charged today. Your card keeps the service live after the 30-day trial.
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Cancel anytime before day 30 to avoid billing.
                </p>
              </div>

              {/* Done-for-you reassurance */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>We'll set everything up for you after signup.</span>
              </div>

              {/* Sanity check note */}
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  You'll see <span className="font-semibold text-foreground">$0 due today</span> and a 30-day free trial at checkout.
                </p>
              </div>

              {/* CTA Button - links directly to Stripe Payment Link */}
              <a
                href={TRIAL_URL}
                className="w-full h-14 text-lg font-bold inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Start Free 30-Day Trial
              </a>

              {/* Under CTA */}
              <p className="text-xs text-center text-muted-foreground">
                No charge today • Cancel anytime before day 30
              </p>

              {/* Post-trial pricing */}
              <div className="text-center pt-2 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  After the trial: <span className="font-semibold text-foreground">$30/month</span>. No contracts.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save with yearly billing after signup.
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
