import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TapAwayCard3D from "@/components/TapAwayCard3D";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-lg border-b border-border">
        <div className="max-w-[1060px] mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <a href="https://tapaway.co" className="font-black text-lg md:text-xl tracking-tight">
              TapAway
            </a>
            {user ? (
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
              >
                Go to Dashboard
              </a>
            ) : (
              <a
                href="/auth"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
              >
                Get Started
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="text-center pt-12 pb-4 px-4">
        <div className="max-w-[1060px] mx-auto">
          <h1 className="text-[clamp(30px,8vw,46px)] font-black leading-tight mb-3">
            Turn Guests into Reviews
            <br />
            Instantly
          </h1>
          <p className="max-w-[700px] mx-auto text-[clamp(16px,4.5vw,20px)] text-[#333b49] mb-4">
            One tap at the table—your branded review page opens. No apps. No
            awkward asks. Just more 5-star reviews that bring in more guests.
          </p>
        </div>

        {/* 3D Card Animation */}
        <div className="my-12">
          <TapAwayCard3D />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
          >
            Start Free Trial
          </a>
          <a
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-extrabold bg-white border border-[#eceff3] text-[#111827] shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
          >
            View Demo
          </a>
        </div>
      </header>

      {/* Metrics */}
      <div className="max-w-[1060px] mx-auto px-4 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black mb-1">🏪 2,300+</div>
            <div className="text-sm text-muted-foreground">Restaurants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black mb-1">⭐ 12,000+</div>
            <div className="text-sm text-muted-foreground">Reviews Collected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black mb-1">🚀 4.9</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black mb-1">⏱️ Day One</div>
            <div className="text-sm text-muted-foreground">Typical First Results</div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-[1060px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Tap at the table.</h4>
                <p className="text-muted-foreground">
                  Guest taps the card or scans the QR—your branded review page opens instantly.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Keep service moving.</h4>
                <p className="text-muted-foreground">
                  No awkward instructions or pauses—guests complete it themselves while you focus on great service.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Results you can feel.</h4>
                <p className="text-muted-foreground">
                  Fresh reviews → better ranking → more foot traffic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why TapAway */}
      <section id="why" className="py-16 px-4 bg-muted/30">
        <div className="max-w-[1060px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            Why Restaurants Choose TapAway
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-3">⚡ Fast & Effortless</h3>
              <p className="text-muted-foreground">
                Customers tap—you get reviews. That simple.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-3">📈 Immediate Impact</h3>
              <p className="text-muted-foreground">
                More reviews means more people find you.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-3">🔐 Privacy‑Friendly</h3>
              <p className="text-muted-foreground">
                Ethical tracking, no cookies—respect guests.
              </p>
            </div>
          </div>

          {/* Feature Accordion */}
          <details className="bg-white rounded-2xl p-6 border border-border shadow-sm cursor-pointer">
            <summary className="font-bold text-lg list-none cursor-pointer">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mr-3">
                Product
              </span>
              See everything TapAway does
            </summary>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <span>Tap‑to‑Review NFC flow</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🎨</span>
                <span>Auto‑open branded review page</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✍️</span>
                <span>Smart copy that boosts completion</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🔁</span>
                <span>QR fallback for older phones</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🗣️</span>
                <span>Staff one‑liners</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🏪</span>
                <span>Multi‑location support</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🧱</span>
                <span>Clunky multi‑step flows → gone</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📦</span>
                <span>Simple to roll out & scale</span>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-[1060px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            Choose Your Plan
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border-2 border-[#111827] shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-4 py-1 rounded-full text-sm font-bold">
                Most popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Restaurant — Monthly</h3>
              <div className="text-4xl font-black mb-4">
                $30 <span className="text-lg font-normal text-muted-foreground">/ month</span>
              </div>
              <p className="text-muted-foreground mb-6">Everything for one location.</p>
              <a
                href="https://buy.stripe.com/fZu14n7tZbXRgSl5QugYU05"
                className="block w-full text-center px-6 py-4 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
              >
                Choose Monthly
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-border shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                Best value
              </div>
              <h3 className="text-2xl font-bold mb-2">Restaurant — Yearly</h3>
              <div className="text-4xl font-black mb-1">
                $300 <span className="text-lg font-normal text-muted-foreground">/ year</span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">Save with annual billing.</div>
              <a
                href="https://buy.stripe.com/4gM7sLcOj2nhcC52EigYU06"
                className="block w-full text-center px-6 py-4 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all"
              >
                Choose Yearly
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#111827] text-white/60">
        <div className="max-w-[1060px] mx-auto text-center">
          <p className="text-sm mb-3">
            © 2025 TapAway. Simple. Fast. More 5-star reviews.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <a 
              href="/terms" 
              className="hover:text-white/70 hover:underline underline-offset-4 transition-colors"
            >
              Terms of Service
            </a>
            <span>·</span>
            <a 
              href="/privacy" 
              className="hover:text-white/70 hover:underline underline-offset-4 transition-colors"
            >
              Privacy Policy
            </a>
            <span>·</span>
            <a 
              href="/refund" 
              className="hover:text-white/70 hover:underline underline-offset-4 transition-colors"
            >
              Refund Policy
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .perspective-1100 {
          perspective: 1100px;
        }
      `}</style>
    </div>
  );
};

export default Index;
