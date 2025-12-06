import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const items = [
  "15 Custom TapAway NFC Cards to Start",
  "Printed With Your Logo & QR Code",
  "Pre-Linked to Your Review Page",
  "Fast Shipping (3–5 Business Days)",
  "Reorder More Cards Anytime From Your Dashboard"
];

export const WhatYouGet = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-20 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-8 md:mb-10"
        >
          What Arrives At Your Restaurant
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm"
        >
          <ul className="space-y-4 md:space-y-5">
            {items.map((item, index) => (
              <motion.li 
                key={index} 
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                </div>
                <span className="text-base text-foreground font-medium">{item}</span>
              </motion.li>
            ))}
          </ul>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-6 pt-5 border-t border-border"
          >
            <p className="text-sm text-muted-foreground text-center">
              Everything arrives ready to use — no setup, no tech headaches.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
