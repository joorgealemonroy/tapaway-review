import { Check, X, Sparkles, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PERSONAL_PLANS, FEATURE_LIST } from "@/lib/personalPlanLimits";

const PersonalPricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/personal")} 
            className="text-xl font-bold text-foreground"
          >
            TapAway
          </button>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Choose your plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Start free or go Pro with a custom NFC card that makes sharing effortless.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {PERSONAL_PLANS.free.name}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {PERSONAL_PLANS.free.price}
                </span>
                <span className="text-muted-foreground">
                  {PERSONAL_PLANS.free.priceSubtext}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Perfect for getting started with a digital profile.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FEATURE_LIST.map((feature) => (
                <li key={feature.key} className="flex items-center gap-3">
                  {feature.included.free ? (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={feature.included.free ? "text-foreground" : "text-muted-foreground/60"}>
                    {'freeValue' in feature ? feature.freeValue : feature.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/personal/start-free")}
            >
              Start Free
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Most Popular
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {PERSONAL_PLANS.paid.name}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {PERSONAL_PLANS.paid.price}
                </span>
                <span className="text-muted-foreground">
                  {PERSONAL_PLANS.paid.priceSubtext}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Everything in Free, plus a custom NFC card shipped to you.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FEATURE_LIST.map((feature) => (
                <li key={feature.key} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">
                    {'proValue' in feature ? feature.proValue : feature.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/personal/order")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Get Pro Card
            </Button>
          </div>
        </div>

        {/* FAQ or additional info */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            Questions? <a href="/support" className="text-primary underline hover:no-underline">Contact us</a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default PersonalPricing;
