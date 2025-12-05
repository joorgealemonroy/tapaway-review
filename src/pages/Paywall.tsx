import { useState, useEffect, useRef } from "react";
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
import { motion, useInView } from "framer-motion";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";
const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[0-9]/, "Password must contain at least one number").regex(/[!?#@$%^&*]/, "Password must contain at least one symbol (! ? # @ $ % ^ & *)")
});

// Animated Info Card Component with scroll-in and hover effects
const AnimatedInfoCard = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px"
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    y: 12,
    scale: 0.98
  }} animate={isInView ? {
    opacity: 1,
    y: 0,
    scale: 1
  } : {
    opacity: 0,
    y: 12,
    scale: 0.98
  }} transition={{
    duration: 0.35,
    ease: "easeOut"
  }} whileHover={{
    y: -4,
    transition: {
      duration: 0.2
    }
  }} className="lg:hover:shadow-lg transition-shadow duration-200">
      <Card className="p-8 bg-white" style={{
      border: '1px solid rgba(167, 243, 208, 0.5)'
    }}>
        {children}
      </Card>
    </motion.div>;
};

// Animated Savings Number Component
const AnimatedSavings = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px"
  });
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    const duration = 800;
    const start = Date.now();
    const targetValue = 210;
    const animate = () => {
      const now = Date.now();
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * targetValue);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [isInView]);
  return <span ref={ref} className="text-base font-bold text-primary">
      ${displayValue} vs Monthly
    </span>;
};
type PlanType = "monthly" | "yearly";
const PLANS = {
  monthly: {
    name: "Monthly",
    price: 30,
    interval: "month",
    checkoutUrl: "https://buy.stripe.com/fZu14n7tZbXRgSl5ku",
    description: "Simple, flexible billing"
  },
  yearlyPromo: {
    name: "Yearly",
    price: 150,
    originalPrice: 300,
    renewalPrice: 300,
    interval: "year",
    checkoutUrl: "https://buy.stripe.com/4gw7sLcOj2nhcC52ei",
    description: "LIMITED DECEMBER DEAL — Ends Dec 31"
  },
  yearlyNormal: {
    name: "Yearly",
    price: 300,
    interval: "year",
    checkoutUrl: "https://buy.stripe.com/4gw7sLcOj2nhcC52ei",
    description: "Best long-term value"
  }
};

// December promo deadline: Dec 31, 11:59:59 PM PST
const PROMO_DEADLINE = new Date('2025-12-31T23:59:59-08:00').getTime();
const Paywall = () => {
  const navigate = useNavigate();
  const {
    checking
  } = usePaywallGuard();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isPromoActive, setIsPromoActive] = useState(Date.now() < PROMO_DEADLINE);
  const [paywallEnabled, setPaywallEnabled] = useState<boolean | null>(null);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string } | null>(null);

  // Check for existing authenticated user who needs to complete checkout
  useEffect(() => {
    const checkExistingUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if they have an active subscription
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("subscription_status")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        
        // Only set as existing user if they DON'T have an active subscription
        if (!restaurant || restaurant.subscription_status !== 'active') {
          setExistingUser({ id: session.user.id, email: session.user.email || '' });
        }
      }
    };
    checkExistingUser();
  }, []);

  // Fetch paywall setting on mount
  useEffect(() => {
    const fetchPaywallSetting = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("paywall_enabled")
          .eq("id", "global")
          .maybeSingle();
        // Default to true if setting not found
        setPaywallEnabled(data?.paywall_enabled ?? true);
      } catch (err) {
        console.error("Failed to fetch paywall setting:", err);
        setPaywallEnabled(true); // Default to enabled on error
      }
    };
    fetchPaywallSetting();
  }, []);

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
      const hours = Math.floor(difference % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
      const minutes = Math.floor(difference % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(difference % (1000 * 60) / 1000);
      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds
      });
    };
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render until we've checked subscription status
  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  // Handler for existing users to continue checkout
  const handleExistingUserCheckout = async () => {
    if (!existingUser) return;
    setLoading(true);
    try {
      // Check if paywall is disabled
      if (paywallEnabled === false) {
        // Create restaurant directly without Stripe
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: existingUser.id,
            restaurant_name: "New Restaurant",
            subscription_status: "active",
            plan_type: "free_trial",
          });

        if (restaurantError && !restaurantError.message.includes("duplicate")) {
          console.error("Failed to create restaurant:", restaurantError);
          throw new Error("Failed to set up account");
        }

        toast.success("Account activated! Redirecting to onboarding...");
        setTimeout(() => {
          navigate("/onboarding");
        }, 1000);
      } else {
        // Proceed with Stripe checkout
        localStorage.setItem("pending_plan_type", selectedPlan);

        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            plan: selectedPlan,
            email: existingUser.email,
            userId: existingUser.id,
          }
        });

        if (sessionError || !sessionData?.url) {
          throw new Error(sessionError?.message || 'Failed to create checkout session');
        }

        toast.success("Redirecting to payment...");
        setTimeout(() => {
          window.location.href = sessionData.url;
        }, 500);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to proceed. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate form
      const validated = signupSchema.parse(formData);

      // Create user account
      const {
        data: authData,
        error: signUpError
      } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            greeting_name: validated.name.trim()
          }
        }
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Priority handling:
      // 1. Super admin → redirect to /admin (should never sign up here, but handle it)
      // 2. Grandfathered test accounts → create test restaurant
      // 3. Normal users → go to Stripe checkout
      
      if (isSuperAdmin(validated.email)) {
        // Super admin should never hit this, but if they do, just send to admin
        toast.success("Super admin account detected. Redirecting to admin dashboard...");
        setTimeout(() => {
          navigate("/admin");
        }, 1000);
        return;
      }

      // Check if user is grandfathered (test account)
      const isGrandfathered = isGrandfatheredUser(validated.email);

      if (isGrandfathered) {
        // For grandfathered users, create restaurant record and skip payment
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: authData.user.id,
            restaurant_name: "New Restaurant",
            subscription_status: "active",
            plan_type: "test",
            greeting_name: validated.name.trim(),
          });

        if (restaurantError) {
          console.error("Failed to create restaurant:", restaurantError);
          throw new Error("Failed to set up account");
        }

        toast.success("Test account created! Redirecting to onboarding...");
        setTimeout(() => {
          navigate("/onboarding");
        }, 1000);
      } else {
        // Check if paywall is disabled - if so, skip Stripe and create restaurant directly
        if (paywallEnabled === false) {
          // Paywall is OFF - create restaurant directly without Stripe
          const { error: restaurantError } = await supabase
            .from("restaurants")
            .insert({
              owner_id: authData.user.id,
              restaurant_name: "New Restaurant",
              subscription_status: "active",
              plan_type: "free_trial",
              greeting_name: validated.name.trim(),
            });

          if (restaurantError) {
            console.error("Failed to create restaurant:", restaurantError);
            throw new Error("Failed to set up account");
          }

          toast.success("Account created! Redirecting to onboarding...");
          setTimeout(() => {
            navigate("/onboarding");
          }, 1000);
        } else {
          // Paywall is ON - proceed with Stripe checkout
          // Store greeting_name in localStorage temporarily for use after Stripe redirect
          localStorage.setItem("pending_greeting_name", validated.name.trim());
          localStorage.setItem("pending_plan_type", selectedPlan);

          // Create Stripe Checkout Session via edge function
          const {
            data: sessionData,
            error: sessionError
          } = await supabase.functions.invoke('create-checkout-session', {
            body: {
              plan: selectedPlan,
              email: validated.email.trim(),
              userId: authData.user.id,
            }
          });
          if (sessionError || !sessionData?.url) {
            throw new Error(sessionError?.message || 'Failed to create checkout session');
          }
          toast.success("Account created! Redirecting to payment...");

          // Small delay to show the success message
          setTimeout(() => {
            window.location.href = sessionData.url;
          }, 1000);
        }
      }
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
  return <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Snowfall Background - Only show during promo */}
      {isPromoActive && <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
          <div className="snowflake">❄</div>
          <div className="snowflake">❅</div>
          <div className="snowflake">❆</div>
        </div>}
      
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              T
            </div>
            <span className="font-bold text-xl">TapAway</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm">
            Already have an account?
          </Button>
        </div>
      </div>

      {/* Mobile Sticky Banner - Only show during promo on mobile */}
      {isPromoActive && timeRemaining && <div className="lg:hidden sticky top-[73px] z-20 border-b border-border/40 animate-fade-in" style={{
      backgroundColor: '#E6FCF8'
    }}>
          <div className="px-4 py-2.5 text-center">
            <p className="text-sm font-bold">
              🎁 Ends in <span className="text-primary">{timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s</span> — Save 50% Today! ❄️
            </p>
          </div>
        </div>}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Value Prop */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Less Work. More Reviews.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            TapAway automates all the work — no extra steps.
          </p>
        </div>

        {/* Desktop Countdown Bar - Only show during promo on desktop */}
        {isPromoActive && timeRemaining && <div className="hidden lg:block max-w-3xl mx-auto mb-12 animate-fade-in">
            <div className="bg-white rounded-xl p-6 flex items-center justify-between gap-6" style={{
          border: '1px solid rgba(167, 243, 208, 0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">❄️</span>
                <div>
                  <p className="text-sm font-semibold" style={{
                color: '#E6D8A8'
              }}>December Deal Ends In:</p>
                  <p className="text-3xl font-black text-primary">
                    {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </p>
                </div>
              </div>
              <span className="text-2xl">🎁</span>
            </div>
          </div>}

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* Left: Pricing Cards */}
          <div className="space-y-6">
            {/* Yearly Plan - Hero */}
            <Card className={`relative p-8 cursor-pointer transition-all bg-white ${selectedPlan === "yearly" ? isPromoActive ? "border-2 border-primary shadow-2xl scale-[1.02]" : "border-2 border-primary shadow-2xl scale-[1.02]" : "border-2 border-primary/40 hover:border-primary/60"}`} style={isPromoActive && selectedPlan === "yearly" ? {
            boxShadow: '0 10px 30px -3px rgba(0,0,0,0.1), 0 0 0 1px rgba(230,216,168,0.2)'
          } : undefined} onClick={() => setSelectedPlan("yearly")}>
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
                {isPromoActive && timeRemaining && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border" style={{
                backgroundColor: '#EEFDF6',
                borderColor: 'rgba(167, 243, 208, 0.4)'
              }}>
                    <span className="text-[10px] opacity-50">❄</span>
                    <span className="text-[11px] text-muted-foreground">Ends:</span>
                    <span className="text-[11px] font-bold text-primary">
                      {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
                    </span>
                  </div>}
                
                {isPromoActive ?
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
                      <div className="mt-3 pt-3 border-t border-border/40">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Gift className="w-3 h-3 text-primary" />
                          Promo code <span className="font-mono font-semibold text-primary">CHRISTMAS150</span> is automatically applied at checkout
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-3 pt-4">
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">Everything in Monthly, plus:</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Save 50% your first year</span>
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
                        <span className="text-sm">Renews at $300/year after your first year</span>
                      </li>
                    </ul>
                  </> :
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
                  </>}
              </div>
            </Card>

            {/* Monthly Plan */}
            <Card className={`relative p-8 cursor-pointer transition-all ${selectedPlan === "monthly" ? "border-2 border-primary shadow-lg scale-[1.02]" : "border border-border hover:border-border/60"}`} onClick={() => setSelectedPlan("monthly")}>
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

            {/* Signup Form or Continue Checkout */}
            <Card className="p-8">
              {existingUser ? (
                // Existing user - show continue checkout UI
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
                    <p className="text-sm text-muted-foreground">
                      Welcome back! Continue to complete your subscription.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Signed in as:</p>
                    <p className="font-medium">{existingUser.email}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedPlan === "yearly" && isPromoActive 
                        ? <>Selected: Yearly • $150 for your first year (renews at $300/year)</>
                        : <>Selected: {displayPlan.name} • ${displayPlan.price}/{displayPlan.interval}</>
                      }
                    </p>
                  </div>

                  <Button 
                    onClick={handleExistingUserCheckout} 
                    className="w-full h-12 text-base font-bold" 
                    disabled={loading}
                  >
                    {loading ? "Processing..." : isPromoActive && selectedPlan === "yearly" ? "Activate Christmas Deal 🎁" : "Continue to Payment"}
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      By continuing, you agree to our{" "}
                      <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
                      <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setExistingUser(null);
                      }}
                      className="text-xs"
                    >
                      Use a different account
                    </Button>
                  </div>
                </div>
              ) : (
                // New user - show signup form
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan === "yearly" && isPromoActive ? <>Start with Yearly • $150 for your first year (renews at $300/year)</> : <>Start with {displayPlan.name} • ${displayPlan.price}/{displayPlan.interval}</>}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input id="name" type="text" required value={formData.name} onChange={e => setFormData({
                        ...formData,
                        name: e.target.value
                      })} placeholder="Jorge" maxLength={100} disabled={loading} />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be used for your personalized dashboard greeting
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({
                        ...formData,
                        email: e.target.value
                      })} placeholder="you@restaurant.com" disabled={loading} />
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({
                        ...formData,
                        password: e.target.value
                      })} placeholder="••••••••" disabled={loading} />
                      <p className="text-xs text-muted-foreground mt-1">
                        8+ characters, at least 1 number and 1 symbol (! ? # @ $ % ^ & *)
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                    {loading ? "Creating account..." : isPromoActive && selectedPlan === "yearly" ? "Activate Christmas Deal 🎁" : "Continue to Payment"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
                    <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                  </p>
                </form>
              )}
            </Card>

            {/* Why TapAway Pays for Itself Section */}
            <AnimatedInfoCard>
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
            </AnimatedInfoCard>
          </div>
        </div>

        {/* Full-Width December Deal Explanation - Only show during promo */}
        {isPromoActive && <div className="max-w-4xl mx-auto mb-16">
            <AnimatedInfoCard>
              <div className="space-y-6">
                {/* Title */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">
                    🎄 TapAway December Deal – Simple Price Breakdown
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    See exactly how the December deal compares to our normal pricing.
                  </p>
                </div>

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
                      <AnimatedSavings />
                    </div>
                  </div>
                </div>

                {/* Holiday Savings Event */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/20">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">🎄 Holiday Savings Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Get TapAway for the lowest price of the entire year. This deal unlocks 12 months of growth for the price of 5.
                  </p>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Promo code <span className="font-mono font-semibold text-primary">CHRISTMAS150</span> is automatically applied at checkout — first year is $150 with the $150 discount, then $300/year after your first year.
                  </p>
                </div>

                {/* Pine Branch Separator */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-x-0 h-px" style={{
                backgroundColor: '#CCF5E9'
              }}></div>
                  <span className="relative bg-white px-3 text-sm opacity-60">🌲</span>
                </div>

                {/* Christmas Deal Notice */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    🎄 This Christmas deal disappears after December 31. On January 1, the plan returns to $300/year for everyone.
                  </p>
                </div>
              </div>
            </AnimatedInfoCard>
          </div>}
      </div>
    </div>;
};
export default Paywall;