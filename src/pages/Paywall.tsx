import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Clock, Snowflake, Gift } from "lucide-react";
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
  yearlyPromo: {
    name: "Yearly",
    price: 150,
    originalPrice: 300,
    renewalPrice: 300,
    interval: "year",
    checkoutUrl: "https://buy.stripe.com/4gw7sLcOj2nhcC52ei",
    description: "LIMITED DECEMBER DEAL — Ends Dec 31",
  },
  yearlyNormal: {
    name: "Yearly",
    price: 300,
    interval: "year",
    checkoutUrl: "https://buy.stripe.com/4gw7sLcOj2nhcC52ei",
    description: "Best long-term value",
  },
};

// December promo deadline: Dec 31, 11:59:59 PM PST
const PROMO_DEADLINE = new Date('2025-12-31T23:59:59-08:00').getTime();

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
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isPromoActive, setIsPromoActive] = useState(Date.now() < PROMO_DEADLINE);

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const difference = PROMO_DEADLINE - now;

      if (difference <= 0) {
        setIsPromoActive(false);
        setTimeRemaining(null);
        return;
      }

      setIsPromoActive(true);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

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
      const plan = selectedPlan === "yearly" 
        ? (isPromoActive ? PLANS.yearlyPromo : PLANS.yearlyNormal)
        : PLANS.monthly;
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

  const yearlyPlan = isPromoActive ? PLANS.yearlyPromo : PLANS.yearlyNormal;
  const displayPlan = selectedPlan === "yearly" ? yearlyPlan : PLANS.monthly;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Snowfall Background - Only show during promo */}
      {isPromoActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
        </div>
      )}
      
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

      {/* Mobile Sticky Banner - Only show during promo on mobile */}
      {isPromoActive && timeRemaining && (
        <div className="lg:hidden sticky top-[73px] z-20 border-b border-border/40 animate-fade-in"
             style={{ backgroundColor: '#E6FCF8' }}>
          <div className="px-4 py-2.5 text-center">
            <p className="text-sm font-bold">
              🎁 Ends in <span className="text-primary">{timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s</span> — Save 50% Today! ❄️
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Value Prop */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Less Work. More Reviews. Automatically.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            TapAway automates all the work — no extra steps.
          </p>
        </div>

        {/* Desktop Countdown Bar - Only show during promo on desktop */}
        {isPromoActive && timeRemaining && (
          <div className="hidden lg:block max-w-3xl mx-auto mb-12 animate-fade-in">
            <div className="bg-white rounded-xl p-6 flex items-center justify-between gap-6"
                 style={{ 
                   border: '1px solid rgba(167, 243, 208, 0.5)',
                   boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                 }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">❄️</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#E6D8A8' }}>December Deal Ends In:</p>
                  <p className="text-3xl font-black text-primary">
                    {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </p>
                </div>
              </div>
              <span className="text-2xl">🎁</span>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* Left: Pricing Cards */}
          <div className="space-y-6">
            {/* Yearly Plan - Hero */}
            <Card
              className={`relative p-8 cursor-pointer transition-all bg-white ${
                selectedPlan === "yearly"
                  ? isPromoActive
                    ? "border-2 border-primary shadow-2xl scale-[1.02]"
                    : "border-2 border-primary shadow-2xl scale-[1.02]"
                  : "border-2 border-primary/40 hover:border-primary/60"
              }`}
              style={isPromoActive && selectedPlan === "yearly" ? {
                boxShadow: '0 10px 30px -3px rgba(0,0,0,0.1), 0 0 0 1px rgba(230,216,168,0.2)'
              } : undefined}
              onClick={() => setSelectedPlan("yearly")}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-4 h-4" />
                BEST VALUE
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">Yearly</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {isPromoActive && <Snowflake className="w-3 h-3 opacity-60" />}
                    {yearlyPlan.description}
                  </p>
                </div>
                
                {/* Small Countdown Timer - Secondary indicator */}
                {isPromoActive && timeRemaining && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                       style={{ 
                         backgroundColor: '#EEFDF6',
                         borderColor: 'rgba(167, 243, 208, 0.4)'
                       }}>
                    <span className="text-[10px] opacity-50">❄</span>
                    <span className="text-[11px] text-muted-foreground">Ends:</span>
                    <span className="text-[11px] font-bold text-primary">
                      {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
                    </span>
                  </div>
                )}
                
                {isPromoActive ? (
                  // Promo Variant
                  <>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <Gift className="w-3.5 h-3.5 opacity-70 flex-shrink-0 mt-2" />
                        <span className="text-5xl font-black text-primary">${PLANS.yearlyPromo.price}</span>
                        <span className="text-muted-foreground">for the first year</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm line-through text-muted-foreground">Normally ${PLANS.yearlyPromo.originalPrice}/year</span>
                        <span className="text-sm font-bold text-primary">You save $150 instantly</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Equivalent to $12.50/month (Monthly plan is $30/month)
                      </p>
                    </div>

                    <ul className="space-y-3 pt-4">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">Everything in Monthly, plus:</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Save 50% this year</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Pay for 5 months, get 12 months</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Lock in the lowest price we'll ever offer</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Renews at ${PLANS.yearlyPromo.renewalPrice}/year after December 31</span>
                      </li>
                    </ul>
                  </>
                ) : (
                  // Normal Variant (After Promo)
                  <>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-primary">${PLANS.yearlyNormal.price}</span>
                        <span className="text-muted-foreground">/year</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Best long-term value if you plan to stay for a year+
                      </p>
                    </div>

                    <ul className="space-y-3 pt-4">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">Everything in Monthly</span>
                      </li>
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
                    </ul>
                  </>
                )}
              </div>
            </Card>

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
                    <span className="text-sm">No contract required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Cancel anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Great for trying TapAway</span>
                  </li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Right: Form and Why Section */}
          <div className="space-y-8">

            {/* Signup Form */}
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan === "yearly" && isPromoActive ? (
                      <>Start with Yearly • $150 for your first year (renews at $300/year)</>
                    ) : (
                      <>Start with {displayPlan.name} • ${displayPlan.price}/{displayPlan.interval}</>
                    )}
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
                {loading ? "Creating account..." : (
                  isPromoActive && selectedPlan === "yearly" 
                    ? "Activate Christmas Deal 🎁" 
                    : "Continue to Payment"
                )}
              </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to our{" "}
                  <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
                  <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                </p>
              </form>
            </Card>

            {/* Why TapAway Pays for Itself Section */}
            <Card className="p-8 bg-muted/30">
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  📈 Why TapAway Pays for Itself
                </h3>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">More 5-star reviews = more customers.</span>
                  </li>
                  <li className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Even 2–3 extra 5-star reviews usually cover a full year of TapAway.</span>
                  </li>
                  <li className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Staff no longer forget to ask for reviews</span> — TapAway automates all the work, no extra steps.
                  </li>
                  <li className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">You get a pro-level system for $12.50/month equivalent.</span>
                  </li>
                </ol>
              </div>
            </Card>
          </div>
        </div>

        {/* Full-Width December Deal Explanation - Only show during promo */}
        {isPromoActive && (
          <div className="max-w-4xl mx-auto mb-16 animate-fade-in">
            <Card className="p-8 bg-white"
                  style={{ 
                    border: '1px solid rgba(167, 243, 208, 0.5)'
                  }}>
              <div className="space-y-6">
                {/* Title */}
                <h3 className="text-2xl font-bold text-center mb-6">
                  🎄 Why TapAway's December Deal Is a No-Brainer
                </h3>

                {/* Price Comparison Block */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <p className="text-sm font-semibold mb-4 text-center text-muted-foreground">Price Comparison:</p>
                  <div className="space-y-3 max-w-md mx-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Monthly × 12:</span>
                      <span className="text-sm font-medium">$360/year</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Normal Yearly:</span>
                      <span className="text-sm font-medium">$300/year</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-primary">December Deal:</span>
                      <span className="text-sm font-bold text-primary">$150/year</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-base font-bold text-primary">You Save:</span>
                      <span className="text-base font-bold text-primary">$210 vs Monthly</span>
                    </div>
                  </div>
                </div>

                {/* Holiday Savings Event */}
                <div className="text-center space-y-3 py-4">
                  <p className="text-lg font-bold" style={{ color: '#E6D8A8' }}>🎄 Holiday Savings Event</p>
                  <p className="text-sm text-muted-foreground italic max-w-2xl mx-auto leading-relaxed">
                    "Get TapAway for the lowest price of the entire year. This deal unlocks 12 months of growth for the price of 5."
                  </p>
                </div>

                {/* Pine Branch Separator */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-x-0 h-px" style={{ backgroundColor: '#CCF5E9' }}></div>
                  <span className="relative bg-white px-3 text-sm opacity-60">🌲</span>
                </div>

                {/* Christmas Deal Notice */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    🎄 This Christmas deal disappears after December 31. On January 1, the plan returns to $300/year for everyone.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Paywall;
