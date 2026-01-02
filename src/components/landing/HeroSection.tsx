import { motion } from "framer-motion";
import { ArrowRight, Play, Smartphone, Star } from "lucide-react";
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
              <span className="text-primary">Free for 60 Days.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              We install everything for you: NFC cards, review page, tracking, and support.{" "}
              <span className="font-semibold text-foreground">No contracts. Cancel anytime.</span>
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
                  Claim Free 60-Day Setup
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
            <p className="text-sm text-muted-foreground">
              No credit card required to start • $30/month after trial
            </p>
          </motion.div>

          {/* Right: Visual */}
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

              {/* NFC Card floating */}
              <motion.div
                initial={{ opacity: 0, x: -30, rotate: -5 }}
                animate={{ opacity: 1, x: 0, rotate: -5 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -left-8 top-1/3 bg-white rounded-xl shadow-2xl p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">NFC Tap</p>
                    <p className="text-[10px] text-muted-foreground">Instant review page</p>
                  </div>
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
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
