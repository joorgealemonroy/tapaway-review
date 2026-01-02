import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, Star, Truck, Shield, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import TapAwayCard3D from "@/components/TapAwayCard3D";

const cities = [
  "San Diego",
  "Los Angeles", 
  "Austin",
  "Miami",
  "Oregon",
  "Chicago",
  "Colorado",
  "Nevada",
];

export const HeroSection = () => {
  const [currentCity, setCurrentCity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCity((prev) => (prev + 1) % cities.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-muted/30" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5"
            >
              <Star className="w-4 h-4 fill-primary" />
              <span>Trusted by 100+ restaurants</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.1] mb-4">
              Get More 5-Star Google Reviews —{" "}
              <span className="text-primary">Free for 30 Days.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0">
              We install everything for you: NFC cards, review page, tracking, and support.{" "}
              <span className="font-semibold text-foreground">Done-for-you. No contracts. Cancel anytime.</span>
            </p>

            {/* Value Expansion */}
            <p className="text-sm md:text-base text-foreground/80 mb-4 max-w-xl mx-auto lg:mx-0 font-medium">
              Turn happy customers into Google reviews, Instagram follows, and social proof — automatically.
            </p>

            {/* Trust Points */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4 text-primary" />
                <span>Ships in 1–2 business days</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>No contracts. Cancel anytime.</span>
              </div>
            </div>

            {/* NFC Card Customization */}
            <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
              <span className="text-primary font-medium">Free custom NFC cards with your logo</span>{" "}
              (optional — unbranded available).
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/paywall"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-foreground text-background font-bold text-base shadow-lg shadow-foreground/20 hover:shadow-xl transition-all"
                >
                  Claim Free 30-Day Setup
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted/50 transition-all text-sm"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-4 h-4 fill-foreground" />
                See How It Works
              </motion.button>
            </div>

            {/* Micro-copy */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Card required to continue after 30 days.{" "}
              <span className="text-foreground font-medium">No charge during the trial.</span>
            </p>
          </motion.div>

          {/* Right: Visual - iPhone + NFC Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="flex flex-col items-center gap-6">

              {/* iPhone Mockup - Realistic Design */}
              <div className="relative mx-auto max-w-[280px]">
                {/* iPhone Frame - Modern Design with Dynamic Island */}
                <div className="relative bg-[#1a1a1a] rounded-[2.5rem] p-2 shadow-2xl shadow-foreground/30">
                  {/* Dynamic Island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
                  
                  <div className="bg-white rounded-[2rem] overflow-hidden aspect-[9/19]">
                    {/* Phone Screen Content */}
                    <div className="p-5 h-full flex flex-col">
                      {/* Status Bar */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 mt-4">
                        <span className="font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1.5 bg-foreground/60 rounded-sm" />
                            <div className="w-1 h-2 bg-foreground/60 rounded-sm" />
                            <div className="w-1 h-2.5 bg-foreground/60 rounded-sm" />
                            <div className="w-1 h-3 bg-foreground/60 rounded-sm" />
                          </div>
                          <div className="w-6 h-2.5 rounded-sm bg-foreground/60 ml-1">
                            <div className="w-1 h-1.5 bg-foreground/60 absolute right-[-2px] top-0.5 rounded-r-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Google Review UI Mockup */}
                      <div className="flex-1 flex flex-col">
                        <div className="text-center mb-3">
                          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">G</span>
                          </div>
                          <h3 className="font-bold text-foreground text-sm">Leave a Review</h3>
                          <p className="text-[10px] text-muted-foreground">for Taqueria Las Islas</p>
                        </div>

                        {/* Star Rating */}
                        <div className="flex justify-center gap-0.5 mb-4">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>

                        {/* Textarea Mockup */}
                        <div className="flex-1 border border-border rounded-lg p-2.5 text-xs text-muted-foreground bg-muted/30">
                          Amazing food and service! The tacos were incredible...
                        </div>

                        {/* Submit Button */}
                        <div className="mt-3 bg-blue-600 text-white text-center py-2.5 rounded-lg font-semibold text-xs">
                          Post Review
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Overlay */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="absolute -right-3 bottom-1/4 bg-white rounded-xl shadow-xl p-3 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">+16</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-foreground">New Reviews</p>
                      <p className="text-[9px] text-muted-foreground">This month</p>
                    </div>
                  </div>
                </motion.div>

                {/* Done-for-you Badge */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="absolute -left-2 top-1/4 bg-white rounded-lg shadow-lg p-2 border border-border"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[9px] font-medium text-foreground">Done-for-you</span>
                  </div>
                </motion.div>
              </div>

              {/* Rotating City Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span>Active in</span>
                <div className="relative h-5 overflow-hidden w-24">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={cities[currentCity]}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="absolute inset-0 font-semibold text-foreground text-center"
                    >
                      {cities[currentCity]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};