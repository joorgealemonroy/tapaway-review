import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Smartphone, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Server Hands the Card",
    description: "Your staff gives the TapAway card to happy guests at the perfect moment.",
    step: "01",
  },
  {
    icon: Smartphone,
    title: "One Tap → Review Page Opens",
    description: "No apps. No searching. One tap opens your real Google review page.",
    highlight: true,
    step: "02",
  },
  {
    icon: TrendingUp,
    title: "Your Reputation Grows",
    description: "More 5-star reviews → higher ranking → more new customers.",
    step: "03",
  },
];

export const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="how-it-works" ref={ref} className="py-14 md:py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-3"
        >
          How It Actually Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm text-muted-foreground text-center mb-10"
        >
          Three simple steps. Real reviews.
        </motion.p>
        
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.12 }}
              whileHover={{ y: -4 }}
              className={`relative group ${step.highlight ? 'md:-translate-y-2' : ''}`}
            >
              {step.highlight && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-primary/25 to-cyan-500/15 rounded-2xl blur-xl"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
              <div className={`relative bg-card border rounded-2xl p-5 h-full transition-all duration-300 ${
                step.highlight ? 'border-primary/40 shadow-lg shadow-primary/15' : 'border-border hover:border-primary/20 hover:shadow-md'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    step.highlight ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <motion.div
                      animate={step.highlight ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <step.icon className={`w-5 h-5 ${step.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                    </motion.div>
                  </div>
                  <span className={`text-2xl font-black ${step.highlight ? 'text-primary/30' : 'text-muted-foreground/20'}`}>
                    {step.step}
                  </span>
                </div>
                <h3 className={`text-base font-bold mb-2 ${step.highlight ? 'text-primary' : ''}`}>{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
