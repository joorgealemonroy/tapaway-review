import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Hand, Smartphone, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Hand,
    title: "Server Hands the Card",
    description: "Your staff gives the TapAway card to happy guests at the perfect moment.",
  },
  {
    icon: Smartphone,
    title: "One Tap → Review Page Opens",
    description: "No apps. No searching. Just instant access to your Google review page.",
    highlight: true,
  },
  {
    icon: TrendingUp,
    title: "Your Reputation Grows",
    description: "More 5-star reviews → higher ranking → more new customers.",
  },
];

export const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-10"
        >
          How It Actually Works
        </motion.h2>
        
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className={`relative group ${step.highlight ? 'md:-translate-y-2' : ''}`}
            >
              {step.highlight && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              <div className={`relative bg-card border rounded-2xl p-5 h-full hover:-translate-y-1 transition-transform duration-300 ${
                step.highlight ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-border'
              }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                  step.highlight ? 'bg-primary/15' : 'bg-muted'
                }`}>
                  <motion.div
                    animate={step.highlight ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <step.icon className={`w-5 h-5 ${step.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                  </motion.div>
                </div>
                <div className={`text-xs font-semibold mb-1.5 ${step.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                  Step {index + 1}
                </div>
                <h3 className="text-base font-bold mb-2">{step.title}</h3>
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
