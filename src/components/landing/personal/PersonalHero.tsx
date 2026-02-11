import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const PersonalHero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
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
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5"
            >
              <Zap className="w-4 h-4 fill-primary" />
              <span>Share Everything in One Tap</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.1] mb-4">
              One link for{" "}
              <span className="text-primary">everything.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
              Share all your links from one beautiful profile — Instagram, TikTok, YouTube, website, payments.{" "}
              <span className="font-semibold text-foreground">Set up in under 2 minutes.</span>
            </p>

            {/* Trust Points */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="font-medium">Works on any phone</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <span>Set up in minutes</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/personal/pricing"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-foreground text-background font-bold text-base shadow-lg shadow-foreground/20 hover:shadow-xl transition-all"
                >
                  Get Your TapAway
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>

            {/* Value reinforcement */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Free plan available • Pro from $6.25/mo
            </p>
          </motion.div>

          {/* Right: Profile Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="flex flex-col items-center gap-6">
              {/* Profile URL Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center w-full max-w-sm"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">👋</span>
                </div>
                <p className="text-lg font-bold text-foreground mb-1">Your Name</p>
                <p className="text-sm text-muted-foreground mb-4">Creator • Designer • Entrepreneur</p>
                <div className="space-y-2">
                  {["Instagram", "TikTok", "YouTube", "Website"].map((label) => (
                    <div key={label} className="w-full py-2.5 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-foreground text-center">
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Handle Example */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-card rounded-xl shadow-lg border border-border px-6 py-3"
              >
                <p className="text-sm text-muted-foreground">Your links open instantly</p>
                <p className="text-lg font-bold text-foreground">tapaway.co/yourname</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};