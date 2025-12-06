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
      description: "Your staff gives the TapAway card to happy guests at the right moment."
    },
    {
      icon: Smartphone,
      step: "2",
      title: "One Tap, Review Page Opens",
      description: "No apps. No searching. Just instant access to your Google review page."
    },
    {
      icon: TrendingUp,
      step: "3",
      title: "Your Reputation Grows",
      description: "More 5-star reviews → higher ranking → more new customers."
    }
  ];

  return (
    <section ref={ref} className="bg-[#F3F4F6] py-12 md:py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-8 md:mb-12"
        >
          How It Actually Works
        </motion.h2>
        
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
                className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-border"
              >
                <div className="flex items-start gap-4 md:flex-col md:text-center">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 md:mx-auto">
                    <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary mb-1 md:mt-3">Step {step.step}</div>
                    <h3 className="text-base md:text-lg font-bold mb-1.5">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
