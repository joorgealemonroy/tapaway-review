import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Smartphone, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import TapAwayCard3D from "@/components/TapAwayCard3D";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <nav className="border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary"></div>
            <span className="text-xl font-bold text-foreground">TapAway</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/demo">
              <Button variant="ghost">View Demo</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Trusted by 100+ restaurants
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Turn Every Customer Into a{" "}
            <span className="text-primary">5-Star Review</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            TapAway's NFC cards make it effortless for your customers to leave glowing reviews. One tap, 
            and they're directly on your Google or Yelp page.
          </p>
          
          <TapAwayCard3D />
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 group">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl p-8 shadow-md border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">One Tap. That's It.</h3>
            <p className="text-muted-foreground">
              No apps to download. No QR codes to scan. Just tap the card with any smartphone 
              and customers land on your review page instantly.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-md border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">More Reviews, Automatically</h3>
            <p className="text-muted-foreground">
              Happy customers are just moments away from leaving you a 5-star review. 
              No friction means more reviews flowing in daily.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-md border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Fully Automated</h3>
            <p className="text-muted-foreground">
              Set it up once and forget it. Your review hub updates automatically. 
              Track stats, edit menus, manage everything from your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-surface-elevated rounded-3xl max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground">Three simple steps to more reviews</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign Up & Customize</h3>
            <p className="text-muted-foreground">
              Create your account, add your restaurant info, and customize your review hub in minutes.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Receive Your Cards</h3>
            <p className="text-muted-foreground">
              We ship premium NFC cards with your custom review hub URL embedded.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Watch Reviews Roll In</h3>
            <p className="text-muted-foreground">
              Place cards at tables or with checks. Customers tap and review. It's that simple.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground">Choose the plan that fits your restaurant</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-8 shadow-md border border-border">
            <h3 className="text-2xl font-bold mb-2">Monthly</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Single location</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Unlimited taps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Analytics dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Menu management</span>
              </li>
            </ul>
            <Link to="/auth">
              <Button className="w-full" variant="outline">Get Started</Button>
            </Link>
          </div>

          <div className="bg-primary text-primary-foreground rounded-2xl p-8 shadow-xl border-2 border-primary relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Yearly</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$249</span>
              <span className="opacity-90">/year</span>
              <div className="text-sm opacity-90 mt-1">Save $99 per year</div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Everything in Monthly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>2 months free</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Free card replacements</span>
              </li>
            </ul>
            <Link to="/auth">
              <Button className="w-full bg-background text-foreground hover:bg-background/90">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-md border border-border">
            <h3 className="text-2xl font-bold mb-2">Multi-Location</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$69</span>
              <span className="text-muted-foreground">/month</span>
              <div className="text-sm text-muted-foreground mt-1">Up to 3 locations</div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in Yearly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>3 locations included</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Centralized dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Dedicated support</span>
              </li>
            </ul>
            <Link to="/auth">
              <Button className="w-full" variant="outline">Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-primary text-primary-foreground rounded-3xl p-12 shadow-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Get More Reviews?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Join hundreds of restaurants already using TapAway to boost their online reputation.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 text-lg px-8">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-elevated">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary"></div>
              <span className="text-lg font-bold">TapAway</span>
            </div>
            <div className="text-muted-foreground text-sm">
              © 2024 TapAway. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
