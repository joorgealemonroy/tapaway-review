import { motion } from "framer-motion";
import { ArrowRight, Play, Smartphone, Star, Truck, Shield, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-muted/30" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Star className="w-4 h-4 fill-primary" />
              <span>Trusted by 100+ restaurants</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1] mb-6">
              Get More 5-Star Google Reviews —{" "}
              <span className="text-primary">Free for 30 Days.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0">
              We install everything for you: NFC cards, review page, tracking, and support.{" "}
              <span className="font-semibold text-foreground">Done-for-you setup. No risk.</span>
            </p>

            {/* Trust Points */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-center lg:justify-start">
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
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              <span className="text-primary font-medium">Free custom NFC cards with your logo</span>{" "}
              (optional — unbranded available).
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/paywall"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold text-lg shadow-lg shadow-foreground/20 hover:shadow-xl transition-all"
                >
                  Claim Free 30-Day Setup
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-muted/50 transition-all"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-4 h-4 fill-foreground" />
                See How It Works
              </motion.button>
            </div>

            {/* Micro-copy */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              No charge during the trial.{" "}
              <span className="text-foreground font-medium">Cancel anytime.</span>
            </p>
          </motion.div>

          {/* Right: Visual - Animated NFC Card Tap */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Phone Mockup */}
            <div className="relative mx-auto max-w-sm">
              {/* Phone Frame */}
              <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl shadow-foreground/20">
                <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                  {/* Phone Screen Content */}
                  <div className="p-6 h-full flex flex-col">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-6">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 rounded-sm bg-foreground/20" />
                      </div>
                    </div>

                    {/* Google Review UI Mockup */}
                    <div className="flex-1 flex flex-col">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">G</span>
                        </div>
                        <h3 className="font-bold text-foreground">Leave a Review</h3>
                        <p className="text-xs text-muted-foreground">for Taqueria Las Islas</p>
                      </div>

                      {/* Star Rating */}
                      <div className="flex justify-center gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      {/* Textarea Mockup */}
                      <div className="flex-1 border border-border rounded-lg p-3 text-sm text-muted-foreground bg-muted/30">
                        Amazing food and service! The tacos were incredible...
                      </div>

                      {/* Submit Button */}
                      <div className="mt-4 bg-blue-500 text-white text-center py-3 rounded-lg font-semibold text-sm">
                        Post Review
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotating NFC Card with Tap Animation */}
              <motion.div
                initial={{ opacity: 0, x: -50, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  x: [-50, -20, -50],
                  y: [20, 0, 20],
                  rotateY: [0, 15, 0],
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.3 },
                  x: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  rotateY: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                }}
                className="absolute -left-6 top-1/3"
                style={{ perspective: "1000px" }}
              >
                {/* NFC Card Design */}
                <div className="relative w-32 h-20 bg-gradient-to-br from-foreground to-foreground/80 rounded-xl shadow-2xl p-3 border border-white/10">
                  {/* Card Content */}
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-white/90 tracking-wider">TAPAWAY</span>
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <Smartphone className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary/80" />
                      <span className="text-[7px] text-white/70">NFC Enabled</span>
                    </div>
                  </div>
                  
                  {/* Tap Ripple Effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                  />
                </div>
              </motion.div>

              {/* Analytics Overlay */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-2xl p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">+16</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">New Reviews</p>
                    <p className="text-[10px] text-muted-foreground">This month</p>
                  </div>
                </div>
              </motion.div>

              {/* Social Proof Indicator */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -right-2 top-1/4 bg-white rounded-lg shadow-lg p-2.5 border border-border"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-medium text-foreground">Done-for-you</span>
                </div>
              </motion.div>
            </div>

            {/* Trust Indicators Below Visual */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="flex flex-wrap justify-center gap-4 mt-8 text-xs text-muted-foreground"
            >
              <span>San Diego</span>
              <span>•</span>
              <span>Los Angeles</span>
              <span>•</span>
              <span>Austin</span>
              <span>•</span>
              <span>Miami</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
