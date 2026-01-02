import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, CreditCard, Shield, Truck, Headphones, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { usePaywallGuard } from "./PaywallGuard";
import { motion } from "framer-motion";
import { isGrandfatheredUser, isSuperAdmin } from "@/lib/grandfatheredUsers";

// Simplified schema - no password required at signup
const signupSchema = z.object({
  name: z.string().trim().min(1, "First name is required").max(100),
  email: z.string().email("Please enter a valid email"),
});

const Paywall = () => {
  const navigate = useNavigate();
  const { checking } = usePaywallGuard();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [paywallEnabled, setPaywallEnabled] = useState<boolean | null>(null);
  const [existingUser, setExistingUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  // Check for existing authenticated user who needs to complete checkout
  useEffect(() => {
    const checkExistingUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("subscription_status")
          .eq("owner_id", session.user.id)
          .maybeSingle();

        if (!restaurant || restaurant.subscription_status !== 'active') {
          setExistingUser({
            id: session.user.id,
            email: session.user.email || ''
          });
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
        setPaywallEnabled(data?.paywall_enabled ?? true);
      } catch (err) {
        console.error("Failed to fetch paywall setting:", err);
        setPaywallEnabled(true);
      }
    };
    fetchPaywallSetting();
  }, []);

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

  const handleExistingUserCheckout = async () => {
    if (!existingUser) return;
    setLoading(true);
    try {
      if (paywallEnabled === false) {
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: existingUser.id,
            restaurant_name: "New Restaurant",
            subscription_status: "active",
            plan_type: "free_trial"
          });
        if (restaurantError && !restaurantError.message.includes("duplicate")) {
          throw new Error("Failed to set up account");
        }
        toast.success("Account activated! Redirecting to onboarding...");
        setTimeout(() => navigate("/onboarding"), 1000);
      } else {
        localStorage.setItem("pending_plan_type", "monthly");
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            plan: "monthly",
            email: existingUser.email,
            userId: existingUser.id
          }
        });
        if (sessionError || !sessionData?.url) {
          throw new Error(sessionError?.message || 'Failed to create checkout session');
        }
        toast.success("Redirecting to secure payment...");
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
      const validated = signupSchema.parse(formData);

      // Generate a temporary password for the user (they'll set it later)
      const tempPassword = `TapAway${Date.now()}!`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            greeting_name: validated.name.trim()
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      if (isSuperAdmin(validated.email)) {
        toast.success("Super admin account detected. Redirecting...");
        setTimeout(() => navigate("/admin"), 1000);
        return;
      }

      const isGrandfathered = isGrandfatheredUser(validated.email);
      if (isGrandfathered) {
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .insert({
            owner_id: authData.user.id,
            restaurant_name: "New Restaurant",
            subscription_status: "active",
            plan_type: "test",
            greeting_name: validated.name.trim()
          });
        if (restaurantError) throw new Error("Failed to set up account");
        toast.success("Test account created! Redirecting...");
        setTimeout(() => navigate("/onboarding"), 1000);
      } else {
        if (paywallEnabled === false) {
          const { error: restaurantError } = await supabase
            .from("restaurants")
            .insert({
              owner_id: authData.user.id,
              restaurant_name: "New Restaurant",
              subscription_status: "active",
              plan_type: "free_trial",
              greeting_name: validated.name.trim()
            });
          if (restaurantError) throw new Error("Failed to set up account");
          toast.success("Account created! Redirecting...");
          setTimeout(() => navigate("/onboarding"), 1000);
        } else {
          localStorage.setItem("pending_greeting_name", validated.name.trim());
          localStorage.setItem("pending_plan_type", "monthly");

          const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
            body: {
              plan: "monthly",
              email: validated.email.trim(),
              userId: authData.user.id
            }
          });
          if (sessionError || !sessionData?.url) {
            throw new Error(sessionError?.message || 'Failed to create checkout session');
          }
          toast.success("Redirecting to secure payment...");
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

  const benefits = [
    { icon: CreditCard, text: "Free custom NFC cards (logo optional)" },
    { icon: Truck, text: "Ships in 1–2 business days" },
    { icon: BarChart3, text: "Review + social hub included" },
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

          {/* Signup Form Card */}
          <Card className="p-6 md:p-8 shadow-lg border-border">
            {existingUser ? (
              // Existing user - continue checkout
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground">
                    Continue to start your free trial.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Signed in as:</p>
                  <p className="font-medium">{existingUser.email}</p>
                </div>

                <Button
                  onClick={handleExistingUserCheckout}
                  className="w-full h-14 text-lg font-bold"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Start Free 30-Day Trial"}
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    No charge today • Cancel anytime
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
              // New user signup form
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jorge"
                      maxLength={100}
                      disabled={loading}
                      className="h-12 mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@restaurant.com"
                      disabled={loading}
                      className="h-12 mt-1.5"
                    />
                  </div>
                </div>

                {/* Payment Section */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      Payment Method
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (required to continue after trial)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    You won't be charged today. Your card keeps the service live after the 30-day trial.
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Cancel anytime before day 30 to avoid billing.
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold"
                  disabled={loading}
                >
                  {loading ? "Setting up your trial..." : "Start Free 30-Day Trial"}
                </Button>

                {/* Under CTA */}
                <p className="text-xs text-center text-muted-foreground">
                  No charge today • Cancel anytime
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
              </form>
            )}
          </Card>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Headphones className="w-4 h-4" />
              <span>Personal support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
