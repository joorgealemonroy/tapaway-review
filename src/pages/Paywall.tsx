import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { usePaywallGuard } from "./PaywallGuard";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!?#@$%^&*]/, "Password must contain at least one symbol (! ? # @ $ % ^ & *)"),
});

type PlanType = "monthly" | "yearly";

const PLANS = {
  monthly: {
    name: "Monthly",
    price: 30,
    interval: "month",
    checkoutUrl: "https://buy.stripe.com/fZu14n7tZbXRgSl5ku",
    description: "Simple, flexible billing",
  },
  yearly: {
    name: "Yearly",
    price: 150,
    originalPrice: 300,
    renewalPrice: 300,
    interval: "year",
    checkoutUrl: "https://buy.stripe.com/4gw7sLcOj2nhcC52ei",
    description: "Lock in 50% savings this year",
    savings: "Save $210 in year one",
    equivalent: "$12.50/month",
  },
};

const Paywall = () => {
  const navigate = useNavigate();
  const { checking } = usePaywallGuard();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Don't render until we've checked subscription status
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      const validated = signupSchema.parse(formData);

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            greeting_name: validated.name.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Store greeting_name in localStorage temporarily for use after Stripe redirect
      localStorage.setItem("pending_greeting_name", validated.name.trim());
      localStorage.setItem("pending_plan_type", selectedPlan);

      // Redirect to Stripe Checkout
      const plan = PLANS[selectedPlan];
      const checkoutUrl = `${plan.checkoutUrl}?prefilled_email=${encodeURIComponent(validated.email)}`;
      
      toast.success("Account created! Redirecting to payment...");
      
      // Small delay to show the success message
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 1000);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please log in instead.");
      } else {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              T
            </div>
            <span className="font-bold text-xl">TapAway</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="text-sm"
          >
            Already have an account?
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Value Prop */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Less Work. More Reviews. Automatically.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every 5-star review typically increases revenue by 5-15%. TapAway automates review collection so your staff doesn't have to.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Monthly Plan */}
          <Card
            className={`relative p-8 cursor-pointer transition-all ${
              selectedPlan === "monthly"
                ? "border-2 border-primary shadow-lg scale-[1.02]"
                : "border border-border hover:border-border/60"
            }`}
            onClick={() => setSelectedPlan("monthly")}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">Monthly</h3>
                <p className="text-sm text-muted-foreground">{PLANS.monthly.description}</p>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">${PLANS.monthly.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited review collection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Custom review hub page</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Real-time analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Cancel anytime</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Yearly Plan - Hero */}
          <Card
            className={`relative p-8 cursor-pointer transition-all bg-gradient-to-br from-primary/5 via-background to-background ${
              selectedPlan === "yearly"
                ? "border-2 border-primary shadow-2xl scale-[1.05]"
                : "border-2 border-primary/40 hover:border-primary/60"
            }`}
            onClick={() => setSelectedPlan("yearly")}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-4 h-4" />
              BEST VALUE
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">Yearly</h3>
                <p className="text-sm text-muted-foreground">{PLANS.yearly.description}</p>
              </div>
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary">${PLANS.yearly.price}</span>
                  <span className="text-muted-foreground">for year one</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm line-through text-muted-foreground">${PLANS.yearly.originalPrice}/year</span>
                  <span className="text-sm font-bold text-primary">{PLANS.yearly.savings}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Renews at ${PLANS.yearly.renewalPrice}/year • {PLANS.yearly.equivalent} equivalent
                </p>
              </div>

              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Everything in Monthly, plus:</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Get 12 months for the cost of 5</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Lock in the lowest price we'll ever offer</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">ROI typically pays back in 2-3 extra reviews</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* ROI Section */}
        <div className="max-w-2xl mx-auto mb-12 p-6 rounded-xl bg-muted/30 border border-border">
          <h3 className="font-bold text-lg mb-2 text-center">Why This Works</h3>
          <p className="text-sm text-muted-foreground text-center">
            More reviews = more customers = more revenue. Industry data shows every 5-star review increases trust and conversion rates. Just 2-3 extra reviews typically generates enough new business to cover your entire yearly cost.
          </p>
        </div>

        {/* Signup Form */}
        <div className="max-w-md mx-auto">
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                <p className="text-sm text-muted-foreground">
                  Start with {plan.name} • ${plan.price}/{plan.interval}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jorge"
                    maxLength={100}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be used for your personalized dashboard greeting
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@restaurant.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    8+ characters, at least 1 number and 1 symbol (! ? # @ $ % ^ & *)
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Continue to Payment"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our{" "}
                <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
                <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Paywall;
