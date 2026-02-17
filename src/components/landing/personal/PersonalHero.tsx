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
            <div className="flex flex-col items-center gap-5">
              {/* Phone Frame */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="relative w-full max-w-[320px]"
              >
                {/* Phone bezel */}
                <div className="rounded-[2.5rem] bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-2xl shadow-black/30">
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-900 rounded-b-2xl z-10" />
                  
                  {/* Screen */}
                  <div className="rounded-[2rem] overflow-hidden bg-gradient-to-b from-violet-600 via-fuchsia-500 to-orange-400 relative">
                    {/* Status bar */}
                    <div className="flex justify-between items-center px-6 pt-8 pb-2 text-white/90 text-xs font-medium">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1.5 bg-white/80 rounded-full" />
                          <div className="w-1 h-2 bg-white/80 rounded-full" />
                          <div className="w-1 h-2.5 bg-white/80 rounded-full" />
                          <div className="w-1 h-3 bg-white/80 rounded-full" />
                        </div>
                        <svg className="w-4 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="21" y="10" width="2" height="4" rx="0.5"/></svg>
                      </div>
                    </div>

                    {/* Profile content */}
                    <div className="px-6 pb-8 pt-2 text-center">
                      <div className="w-24 h-24 rounded-full mx-auto mb-3 ring-4 ring-white/30 overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-0.5 tracking-tight">Alex Rivera</h3>
                      <p className="text-white/80 text-sm font-medium mb-5">Creative Director & Designer</p>

                      <div className="space-y-2.5">
                        {[
                          { icon: "📸", label: "Instagram", sub: "@alexrivera" },
                          { icon: "🎵", label: "TikTok", sub: "245K followers" },
                          { icon: "▶️", label: "YouTube", sub: "Design tutorials" },
                          { icon: "🌐", label: "My Portfolio", sub: "alexrivera.design" },
                          { icon: "☕", label: "Buy Me a Coffee", sub: "Support my work" },
                        ].map((item) => (
                          <motion.div
                            key={item.label}
                            whileHover={{ scale: 1.02, y: -1 }}
                            className="w-full py-3 px-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 text-left flex items-center gap-3 cursor-pointer hover:bg-white/30 transition-colors"
                          >
                            <span className="text-lg">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">{item.label}</p>
                              <p className="text-xs text-white/60 truncate">{item.sub}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="absolute -left-4 top-1/4 bg-card rounded-xl shadow-lg border border-border px-3 py-2 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">Instant share</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="absolute -right-4 top-1/2 bg-card rounded-xl shadow-lg border border-border px-3 py-2 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs">🔗</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">5 links</span>
                </motion.div>
              </motion.div>

              {/* Handle Example */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-card rounded-xl shadow-lg border border-border px-6 py-3 text-center"
              >
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your personal link</p>
                <p className="text-lg font-bold text-foreground">tapaway.co/<span className="text-primary">alexrivera</span></p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};