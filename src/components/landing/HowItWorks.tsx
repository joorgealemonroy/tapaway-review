import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { CreditCard, Smartphone, TrendingUp } from "lucide-react";

export const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const steps = [
    {
      icon: CreditCard,
      step: "1",
      title: "Server Hands the Card",
      description: "After great service, your staff hands the TapAway card to the guest at the perfect moment."
    },
    {
      icon: Smartphone,
      step: "2",
      title: "One Tap, Review Page Opens",
      description: "No apps. No searching. One tap opens your custom Google review page instantly.",
      highlight: true
    },
    {
      icon: TrendingUp,
      step: "3",
      title: "Your Reputation Grows Automatically",
      description: "More 5-star reviews → higher rankings → more new customers discovering your business."
    }
  ];

  return (
    <section ref={ref} className="bg-background py-14 md:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-2"
        >
          How It Actually Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center text-sm text-muted-foreground mb-10 md:mb-12"
        >
          (In Real Life)
        </motion.p>
        
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
                className={`relative bg-card rounded-2xl p-6 md:p-7 shadow-sm border transition-all duration-300 hover:shadow-md ${
                  step.highlight 
                    ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-[0_0_20px_rgba(11,165,164,0.1)]" 
                    : "border-border"
                }`}
              >
                <div className="flex items-start gap-4 md:flex-col md:text-center">
                  <div className={`flex-shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-2xl md:mx-auto ${
                    step.highlight 
                      ? "bg-primary/15" 
                      : "bg-muted"
                  }`}>
                    <motion.div
                      animate={step.highlight ? { 
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.8, 1]
                      } : {}}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Icon className={`w-7 h-7 ${step.highlight ? "text-primary" : "text-foreground/70"}`} strokeWidth={1.5} />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs font-bold mb-1.5 md:mt-4 ${step.highlight ? "text-primary" : "text-muted-foreground"}`}>
                      Step {step.step}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
                
                {/* Highlight glow effect for step 2 */}
                {step.highlight && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(11,165,164,0)",
                        "0 0 20px 2px rgba(11,165,164,0.15)",
                        "0 0 0 0 rgba(11,165,164,0)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
