import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Activity, Star, Eye, Calendar, Bot } from "lucide-react";

const features = [
  { 
    icon: Activity, 
    title: "Taps Per Week", 
    description: "See how many guests are engaging with your cards." 
  },
  { 
    icon: Star, 
    title: "Google Reviews Sent", 
    description: "Track how many reviews are being generated through TapAway." 
  },
  { 
    icon: Eye, 
    title: "Menu Views", 
    description: "Know how often guests are checking your menu." 
  },
  { 
    icon: Calendar, 
    title: "Peak Traffic Days", 
    description: "Identify your busiest days based on real guest activity." 
  },
  { 
    icon: Bot, 
    title: "AI Coach Suggestions", 
    description: "Get automated tips to help you improve your rating and grow faster." 
  }
];

export const DashboardShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-3"
        >
          Everything You Need — One Simple Dashboard
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-sm text-muted-foreground mb-10 max-w-lg mx-auto"
        >
          See exactly how your TapAway cards are performing in real time. No guessing. No spreadsheets.
        </motion.p>

        {/* Mobile: 2-column grid */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-sm mb-1">{feature.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Desktop: 3-column grid with centered last row */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-5 mb-5">
            {features.slice(0, 3).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
                  className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 mb-4">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto">
            {features.slice(3).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.08 }}
                  className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 mb-4">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Real-time badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-center gap-2 mt-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs text-muted-foreground">Live data • Real-time updates</span>
        </motion.div>
      </div>
    </section>
  );
};
