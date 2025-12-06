import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import TapAwayCard3D from "@/components/TapAwayCard3D";
import { NewHero } from "@/components/landing/NewHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { DashboardShowcase } from "@/components/landing/DashboardShowcase";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { RefundGuarantee } from "@/components/landing/RefundGuarantee";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { RealisticStats } from "@/components/landing/RealisticStats";

const Index = () => {
  const { user } = useAuth();
  
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
              <a href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all">
                Go to Dashboard
              </a>
            ) : (
              <a href="/paywall" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all">
                Get Started
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* New Black Hero */}
      <NewHero />

      {/* Realistic Stats */}
      <RealisticStats />

      {/* How TapAway Works */}
      <HowItWorks />

      {/* 3D Card Section */}
      <section id="get-started" className="py-16 px-4 bg-muted/30">
        <div className="max-w-[1060px] mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-black mb-4"
          >
            One Tap. Real Reviews.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-[600px] mx-auto text-muted-foreground mb-8"
          >
            Your guests tap the card at their table — your branded review page opens instantly. No apps, no friction.
          </motion.p>

          {/* 3D Card Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="my-8"
          >
            <TapAwayCard3D />
          </motion.div>
        </div>
      </section>

      {/* Who It's For */}
      <WhoItsFor />

      {/* Testimonials */}
      <Testimonials />

      {/* Dashboard Showcase */}
      <DashboardShowcase />

      {/* What You Get in the Mail */}
      <WhatYouGet />

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 bg-muted/30">
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Simple, Honest Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. Choose what works for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white rounded-2xl p-8 border border-border shadow-lg relative">
              <h3 className="text-2xl font-bold mb-2">Monthly</h3>
              <p className="text-sm text-muted-foreground mb-4">Flexible, cancel anytime</p>
              <div className="text-5xl font-black mb-6">
                $30 <span className="text-lg font-normal text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  15 custom NFC cards included
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Full dashboard access
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Real-time analytics
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cancel anytime
                </li>
              </ul>
              <a href="/paywall" className="block w-full text-center px-6 py-4 rounded-xl font-extrabold bg-[#111827] text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all">
                Get Started
              </a>
            </div>

            {/* Yearly Plan - December Special */}
            <div className="bg-gradient-to-br from-primary/5 via-white to-white rounded-2xl p-8 border-2 border-primary shadow-2xl relative transform hover:scale-[1.02] transition-transform">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                DECEMBER SPECIAL
              </div>
              <h3 className="text-2xl font-bold mb-2">Yearly</h3>
              <p className="text-sm text-muted-foreground mb-4">Limited time offer</p>
              <div className="mb-2">
                <div className="text-5xl font-black text-primary mb-2">
                  $150 <span className="text-lg font-normal text-muted-foreground">first year</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm line-through text-muted-foreground">$300/year</span>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Save $150</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Renews at $300/year after first year
                </p>
              </div>
              <ul className="space-y-3 mb-8 mt-6">
                <li className="flex items-start gap-2 text-sm font-medium">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Monthly, plus:
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Get 12 months for the cost of 5
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  December offer only — price increases after
                </li>
              </ul>
              <a href="/paywall" className="block w-full text-center px-6 py-4 rounded-xl font-extrabold bg-gradient-to-r from-primary to-primary/80 text-white shadow-[0_12px_34px_rgba(15,23,42,0.10)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)] transition-all">
                Start December Special
              </a>
            </div>
          </div>
          
          {/* Refund Guarantee */}
          <RefundGuarantee />
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#111827] text-white/60">
        <div className="max-w-[1060px] mx-auto text-center">
          <p className="text-sm mb-3">© 2025 TapAway. Simple. Fast. More 5-star reviews.</p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <a href="/terms" className="hover:text-white/70 hover:underline underline-offset-4 transition-colors">
              Terms of Service
            </a>
            <span>·</span>
            <a href="/privacy" className="hover:text-white/70 hover:underline underline-offset-4 transition-colors">
              Privacy Policy
            </a>
            <span>·</span>
            <a href="/refund" className="hover:text-white/70 hover:underline underline-offset-4 transition-colors">
              Refund Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
