import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { BarChart3, Star, BookOpen, Calendar, Bot } from "lucide-react";

const features = [
  { icon: BarChart3, label: "Taps per Week", desc: "See guest engagement live" },
  { icon: Star, label: "Google Reviews Sent", desc: "Track reviews generated" },
  { icon: BookOpen, label: "Menu Views", desc: "Know what guests check" },
  { icon: Calendar, label: "Peak Traffic Days", desc: "Find your busiest times" },
  { icon: Bot, label: "AI Coach Suggestions", desc: "Get tips to grow faster" },
];

export const DashboardShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Everything You Need — One Simple Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Live performance. No guessing. No spreadsheets.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="font-semibold text-xs mb-0.5">{feature.label}</div>
              <div className="text-[10px] text-muted-foreground">{feature.desc}</div>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="text-xs text-muted-foreground">Live data • Real-time updates</span>
        </motion.div>
      </div>
    </section>
  );
};
