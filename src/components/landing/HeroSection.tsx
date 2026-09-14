import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
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

const clientFeedback = [
  {
    name: "Victor Ramirez",
    initials: "VR",
    quote: "TapAway makes it easy for customers to find everything about our business in one place. Simple, professional, and convenient.",
  },
  {
    name: "Sonia Berumen",
    initials: "SB",
    quote: "My favorite part is that they handle the setup. As a business owner, having one less thing to figure out means a lot.",
  },
  {
    name: "Manuel Monroy",
    initials: "MM",
    quote: "TapAway makes it easy to stay connected with our customers. We can send a quick text with a special or reminder and give them a reason to come back through the door.",
  },
  {
    name: "Amelia Zavala",
    initials: "AZ",
    quote: "I love how TapAway brings our links together in a way that feels organized and professional. It’s such a nice touch for our business.",
  },
  {
    name: "Alexis Ramirez",
    initials: "AR",
    quote: "TapAway fits naturally into the customer experience. Our team can share our business information without slowing things down.",
  },
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
      
      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 py-8 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] mb-5 md:mb-8">
              Turn Taps into{" "}
              <span className="text-primary whitespace-nowrap">5-Star</span> Reviews.
            </h1>

            {/* Mobile card visual */}
            <div className="flex justify-center lg:hidden mb-6">
              <TapAwayCard3D width="min(180px, 55vw)" />
            </div>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 md:mb-12 max-w-xl">
              Collect reviews effortlessly with branded NFC Cards. Zero setup. <span className="text-primary font-bold">$0 Today</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-start items-start">
              <div className="flex flex-col items-center w-full sm:w-auto">
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

                <p className="text-xs text-center text-muted-foreground mt-3 w-full">
                  Pay $0 today. Cancel anytime.
                </p>
              </div>

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

        <div className="mt-12 md:mt-16">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-2xl md:text-3xl font-black text-center mb-6"
          >
            Verified Client Feedback
          </motion.h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clientFeedback.map((feedback, index) => (
              <motion.article
                key={feedback.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + index * 0.08 }}
                className="bg-card rounded-2xl p-5 border border-border shadow-lg shadow-black/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm"
                    aria-label={`Photo placeholder for ${feedback.name}`}
                  >
                    {feedback.initials}
                  </div>
                  <h3 className="font-bold text-foreground">{feedback.name}</h3>
                </div>
                <blockquote className="text-sm leading-relaxed text-foreground/90">
                  “{feedback.quote}”
                </blockquote>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
