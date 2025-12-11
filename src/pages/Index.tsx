import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
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
const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px"
  });
  return <section ref={ref} className="py-14 md:py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <motion.h2 initial={{
        opacity: 0,
        y: 20
      }} animate={isInView ? {
        opacity: 1,
        y: 0
      } : {}} transition={{
        duration: 0.5
      }} className="text-2xl md:text-3xl font-black text-center mb-3">
          Simple, Transparent Pricing
        </motion.h2>
        

        <div className="grid md:grid-cols-2 gap-4">
          {/* Monthly */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={isInView ? {
          opacity: 1,
          y: 0
        } : {}} transition={{
          duration: 0.5,
          delay: 0.15
        }} whileHover={{
          y: -3
        }} className="bg-card border border-border rounded-2xl p-5 transition-shadow hover:shadow-md">
            <h3 className="font-bold text-base mb-1">Monthly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-black">$30</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Cancel anytime</p>
            <ul className="space-y-2.5 mb-5">
              {["Unlimited review collection", "Custom review hub", "Real-time analytics", "Cancel anytime"].map((item, i) => <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  <span>{item}</span>
                </li>)}
            </ul>
            <a href="/paywall" className="block w-full py-3 rounded-lg border border-border text-center font-semibold text-sm hover:bg-muted transition-colors">
              Get Started
            </a>
          </motion.div>

          {/* Yearly */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={isInView ? {
          opacity: 1,
          y: 0
        } : {}} transition={{
          duration: 0.5,
          delay: 0.2
        }} whileHover={{
          y: -3
        }} className="relative bg-card border-2 border-primary rounded-2xl p-5 shadow-lg shadow-primary/10">
            <motion.div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full" animate={{
            scale: [1, 1.05, 1]
          }} transition={{
            duration: 2,
            repeat: Infinity
          }}>
              BEST VALUE
            </motion.div>
            <h3 className="font-bold text-base mb-1 mt-1">December Special</h3>
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-2xl font-black text-primary">$150</span>
              <span className="text-sm text-muted-foreground">/first year</span>
              <span className="text-xs text-muted-foreground/60 line-through ml-1">$300</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Then $300/year</p>
            <ul className="space-y-2.5 mb-5">
              {["Lock in the lowest price we'll offer", "Pays for itself with 2–3 new reviews", "Includes cards, dashboard & setup"].map((item, i) => <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  <span>{item}</span>
                </li>)}
            </ul>
            <motion.a href="/paywall" className="block w-full py-3 rounded-lg bg-primary text-primary-foreground text-center font-semibold text-sm" whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }}>
              Start December Special
            </motion.a>
            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Most restaurants choose yearly after their first month of results.
            </p>
          </motion.div>
        </div>
      </div>
    </section>;
};
const Index = () => {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();
  
  // Determine dashboard link based on role
  const dashboardLink = isSalesRep ? "/rep" : "/dashboard";
  
  return <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center py-2.5">
            <a href="https://tapaway.co" className="font-black text-lg tracking-tight">
              TapAway
            </a>
            {user ? <a href={dashboardLink} className="px-4 py-2 rounded-lg font-bold text-sm bg-foreground text-background">
                Dashboard
              </a> : <a href="/paywall" className="px-4 py-2 rounded-lg font-bold text-sm bg-foreground text-background">
                Get Started
              </a>}
          </div>
        </div>
      </nav>

      <NewHero />
      <RealisticStats />
      <HowItWorks />

      {/* 3D Card Section */}
      <section className="py-10 md:py-12 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="text-xl md:text-2xl font-black mb-2">
            One Tap. Real Reviews.
          </motion.h2>
          <motion.p initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} className="text-sm text-muted-foreground mb-5">
            Your server hands the TapAway card to happy guests — one tap later, your Google review page opens.
          </motion.p>
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6,
          delay: 0.2
        }}>
            <TapAwayCard3D />
          </motion.div>
        </div>
      </section>

      <WhoItsFor />
      <Testimonials />
      <DashboardShowcase />
      <WhatYouGet />
      <PricingSection />
      <RefundGuarantee />
      <FinalCTA />

      {/* Footer */}
      <footer className="py-6 px-4 bg-[#111827] text-white/60">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs mb-1.5">© 2025 TapAway. Simple. Fast. More 5-star reviews.</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/40">
            <a href="/terms" className="hover:text-white/70 transition-colors">Terms</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
            <span>·</span>
            <a href="/refund" className="hover:text-white/70 transition-colors">Refund</a>
            <span>·</span>
            <a href="/rep/apply" className="hover:text-white/70 transition-colors">Become a Sales Partner</a>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;