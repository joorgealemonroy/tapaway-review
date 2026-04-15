import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/40 border border-slate-800 backdrop-blur-sm text-slate-300 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Star className="w-4 h-4 fill-primary" />
              <span>Trusted by 150+ businesses nationwide</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] mb-8">
              Turn Taps into{" "}
              <span className="text-primary whitespace-nowrap">5-Star</span> Reviews.
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl">
              Grow your presence with high-performance branded NFC Cards.
              Collect reviews effortlessly, or use it as your ultimate digital business card with unlimited taps. Zero setup. <span className="text-primary font-bold">$0 Today</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-start">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  to="/start"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all"
                >
                  Send Me My Cards
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-4 rounded-xl border border-primary text-primary font-semibold hover:bg-primary/10 transition-all text-sm"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-4 h-4 fill-primary" />
                Watch a 30-Sec Demo
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mt-16 lg:mt-0 hidden lg:block"
          >
            <div className="flex flex-col items-center gap-6">
              <div style={{ transform: "perspective(1000px) rotateX(10deg) rotateY(-5deg)" }}>
                <TapAwayCard3D />
              </div>

              {/* Rotating City Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground mt-8"
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
