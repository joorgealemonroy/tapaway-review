import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const proFeatures = [
  "Your own URL: tapaway.co/yourname",
  "Unlimited links & content blocks",
  "Custom header image",
  "Photo collage block",
  "Email capture form",
  "Advanced analytics",
  "Priority support",
];

const freeFeatures = [
  "Up to 5 links",
  "Basic content blocks",
  "Social icon bar",
  "YouTube & image blocks",
];

const PersonalPricing = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("pro");
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/personal" className="text-xl font-black text-foreground">
            TapAway
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-10 pb-6 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2 tracking-tight">
            Pick your vibe
          </h1>
          <p className="text-muted-foreground text-base">
            Start free, upgrade when you're ready.
          </p>
        </motion.div>
      </section>

      {/* Plan Toggle */}
      <div className="flex justify-center px-4 pb-6">
        <div className="relative flex bg-muted rounded-full p-1 w-56">
          {(["free", "pro"] as const).map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className="relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-200"
              style={{ color: selectedPlan === plan ? "hsl(var(--background))" : "hsl(var(--muted-foreground))" }}
            >
              {plan === "free" ? "Free" : "Pro"}
            </button>
          ))}
          <motion.div
            layoutId="plan-toggle"
            className="absolute top-1 bottom-1 rounded-full bg-foreground"
            style={{ width: "calc(50% - 4px)" }}
            animate={{ left: selectedPlan === "free" ? 4 : "calc(50%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>
      </div>

      {/* Plan Card */}
      <section className="px-4 pb-6 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {selectedPlan === "pro" ? (
            <motion.div
              key="pro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-card border border-border rounded-2xl px-5 py-6"
            >
              {/* Billing toggle */}
              <div className="flex gap-2 mb-5">
                {(["yearly", "monthly"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      billing === b
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b === "yearly" ? "Yearly" : "Monthly"}
                  </button>
                ))}
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-4xl font-black text-foreground">
                  {billing === "yearly" ? "$75" : "$10"}
                </span>
                <span className="text-muted-foreground ml-1">
                  /{billing === "yearly" ? "year" : "month"}
                </span>
              </div>
              {billing === "yearly" && (
                <p className="text-xs text-primary font-medium mb-5">
                  That's only $6.25/mo
                </p>
              )}
              {billing === "monthly" && <div className="mb-5" />}

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={() =>
                  navigate(
                    `/personal/signup?plan=${billing === "yearly" ? "yearly" : "monthly"}`
                  )
                }
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="free"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-card border border-border rounded-2xl px-5 py-6"
            >
              {/* Price */}
              <div className="mb-5">
                <span className="text-4xl font-black text-foreground">$0</span>
                <span className="text-muted-foreground ml-1">forever</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={() => navigate("/personal/signup?plan=free")}
              >
                Start Free
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Bottom */}
      <div className="text-center pb-12 px-4">
        <p className="text-muted-foreground text-xs mb-1">
          30-day money-back guarantee on paid plans
        </p>
        <p className="text-muted-foreground text-xs">
          Questions?{" "}
          <Link to="/support" className="text-primary underline hover:no-underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PersonalPricing;
