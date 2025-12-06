import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const items = [
  "15 Custom TapAway NFC Cards (to start)",
  "Printed with Your Logo & QR",
  "Ships in 3–5 Business Days",
  "Request More Anytime from Your Dashboard",
];

export const WhatYouGet = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-16 px-4 bg-muted/30">
      <div className="max-w-lg mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black mb-6"
        >
          What You Get in the Mail
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm"
        >
          <ul className="space-y-3 text-left">
            {items.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm">{item}</span>
              </motion.li>
            ))}
          </ul>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border"
          >
            Everything arrives ready to use — no setup, no tech headaches.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};
