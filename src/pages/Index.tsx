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
          <div className="flex justify-between items-center py-2.5">
            <a href="https://tapaway.co" className="font-black text-lg tracking-tight">
              TapAway
            </a>
            {user ? (
              <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#111827] text-white shadow-sm hover:shadow-md transition-all">
                Dashboard
              </a>
            ) : (
              <a href="/paywall" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#111827] text-white shadow-sm hover:shadow-md transition-all">
                Get Started
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <NewHero />

      {/* Stats */}
      <RealisticStats />

      {/* How It Works */}
      <HowItWorks />

      {/* 3D Card Section */}
      <section id="get-started" className="py-10 md:py-14 px-4 bg-muted/30">
        <div className="max-w-[1060px] mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-black mb-3"
          >
            One Tap. Real Reviews.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-md mx-auto text-sm text-muted-foreground mb-6"
          >
            Your server hands the TapAway card to happy guests — one tap later, your Google review page opens.
          </motion.p>

          {/* 3D Card Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="my-6"
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
      <section id="pricing" className="py-10 md:py-14 px-4 bg-muted/30">
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black mb-2">Simple, Honest Pricing</h2>
            <p className="text-sm text-muted-foreground">No hidden fees. Choose what works for you.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 md:gap-6 max-w-3xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white rounded-xl p-5 md:p-6 border border-border shadow-sm">
              <h3 className="text-lg font-bold mb-1">Monthly</h3>
              <p className="text-xs text-muted-foreground mb-3">Cancel anytime</p>
              <div className="text-3xl md:text-4xl font-black mb-4">
                $30 <span className="text-sm font-normal text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  15 custom NFC cards included
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Real-time analytics
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited reviews
                </li>
              </ul>
              <a href="/paywall" className="block w-full text-center px-5 py-3 rounded-lg font-bold text-sm bg-[#111827] text-white shadow-sm hover:shadow-md transition-all">
                Get Started
              </a>
            </div>

            {/* Yearly Plan - December Special */}
            <div className="bg-gradient-to-br from-primary/5 via-white to-white rounded-xl p-5 md:p-6 border-2 border-primary shadow-lg relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold shadow-md">
                DECEMBER SPECIAL
              </div>
              <h3 className="text-lg font-bold mb-1 mt-1">Yearly</h3>
              <p className="text-xs text-muted-foreground mb-3">Best value</p>
              <div className="mb-3">
                <div className="text-3xl md:text-4xl font-black text-primary">
                  $150 <span className="text-sm font-normal text-muted-foreground">first year</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs line-through text-muted-foreground">$300/year</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Save $150</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Renews at $300/year
                </p>
              </div>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-start gap-2 text-sm font-medium">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Monthly
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  12 months for cost of 5
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  December offer only
                </li>
              </ul>
              <a href="/paywall" className="block w-full text-center px-5 py-3 rounded-lg font-bold text-sm bg-primary text-white shadow-sm hover:shadow-md transition-all">
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
      <footer className="py-8 px-4 bg-[#111827] text-white/60">
        <div className="max-w-[1060px] mx-auto text-center">
          <p className="text-xs mb-2">© 2025 TapAway. Simple. Fast. More 5-star reviews.</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-white/40">
            <a href="/terms" className="hover:text-white/70 transition-colors">Terms</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
            <span>·</span>
            <a href="/refund" className="hover:text-white/70 transition-colors">Refund</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
