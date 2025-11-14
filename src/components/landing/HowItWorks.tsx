import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Smartphone, MessageSquare, TrendingUp } from "lucide-react";

export const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      icon: Smartphone,
      title: "Tap Card",
      description: "Your customers simply tap your TapAway NFC card using their phone — no app, no typing, just one tap."
    },
    {
      icon: MessageSquare,
      title: "Leave a Review Instantly",
      description: "Your customers are directly taken to your custom landing page — ready to leave a 5-star review in seconds."
    },
    {
      icon: TrendingUp,
      title: "Watch your Reputation Grow",
      description: "Every tap builds your credibility online. More reviews = more trust = more customers discovering your business."
    }
  ];

  return (
    <section ref={ref} className="bg-[#F3F4F6] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(32px,6vw,48px)] font-black text-center mb-16"
        >
          How TapAway Works.
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black/5 mb-6">
                  <Icon className="w-8 h-8 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
