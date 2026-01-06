import { Check, X, Sparkles, CreditCard, Truck, Smartphone, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import PersonalCard3D from "@/components/PersonalCard3D";

const PersonalPricing = () => {
  const navigate = useNavigate();

  const proFeatures = [
    "Custom NFC card with your name",
    "Free shipping (1-2 business days)",
    "Your own URL: tapaway.co/yourname",
    "Unlimited links & content blocks",
    "Custom header image",
    "Photo collage block",
    "Email capture form",
    "Advanced analytics",
    "Change your links anytime",
  ];

  const freeFeatures = [
    "Digital profile only (no card)",
    "URL with prefix: tapaway.co/tapyourname",
    "Up to 5 links",
    "Basic content blocks",
    "Social icon bar",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/personal" className="text-xl font-black text-foreground">
            TapAway
          </Link>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
            One tap. All your links.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            Get a custom NFC card that opens your profile instantly when someone taps their phone.
          </p>
          
          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <span>Free shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>iPhone & Android</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span>Ships in 1-2 days</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          
          {/* Pro Plan - Primary (3 columns on large screens) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 bg-card border-2 border-primary rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-lg shadow-primary/10"
          >
            {/* Card Preview */}
            <div className="mb-8 flex justify-center">
              <div className="scale-90 origin-top">
                <PersonalCard3D />
              </div>
            </div>

            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5" />
              RECOMMENDED
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-black text-foreground mb-2">
                Pro Card
              </h2>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-foreground">$99</span>
                <span className="text-muted-foreground">/year</span>
                <span className="text-sm text-muted-foreground line-through ml-2">$108</span>
              </div>
              <p className="text-sm text-primary font-medium">
                Save $9 with yearly — or $9/month
              </p>
              <p className="text-muted-foreground mt-3 text-sm">
                Custom NFC card with your name, shipped free to your door.
              </p>
            </div>

            {/* Key benefit callout */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Physical card included</p>
                  <p className="text-muted-foreground text-sm">
                    We design, print, and ship your personalized TapAway card — all set up for you.
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full text-base font-bold h-14"
                onClick={() => navigate("/personal/signup?plan=yearly")}
              >
                Get Your Pro Card — $99/year
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate("/personal/signup?plan=monthly")}
              >
                Or $9/month
              </Button>
            </div>
          </motion.div>

          {/* Free Plan - Secondary (2 columns on large screens) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Free
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground text-sm">forever</span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Digital profile only. No physical card.
              </p>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {freeFeatures.map((feature, i) => (
                <li key={feature} className="flex items-start gap-3">
                  {i < 2 ? (
                    <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Check className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${i < 2 ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <Button 
              variant="ghost" 
              size="lg" 
              className="w-full text-muted-foreground"
              onClick={() => navigate("/personal/signup?plan=free")}
            >
              Start Free
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              Upgrade to Pro anytime to get your card
            </p>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground text-sm mb-2">
            Questions? <Link to="/support" className="text-primary underline hover:no-underline">Contact us</Link>
          </p>
          <p className="text-muted-foreground/60 text-xs">
            30-day money-back guarantee on all paid plans
          </p>
        </motion.div>
      </section>
    </div>
  );
};

export default PersonalPricing;
