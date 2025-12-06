import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Package, Sparkles } from "lucide-react";

const items = [
  "15 Custom TapAway NFC Cards (To Start)",
  "Printed with Your Logo + QR Code",
  "Pre-Linked to Your Google Review Page",
  "Ready to Use — No Setup Required",
  "Ships in 3–5 Business Days",
  "Request More Anytime from Dashboard",
];

export const WhatYouGet = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-16 px-4 bg-background">
      <div className="max-w-lg mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-3"
        >
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-2xl md:text-3xl font-black">
            What Arrives at Your Door
          </h2>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm text-muted-foreground mb-6"
        >
          Premium cards, ready to deploy
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          whileHover={{ scale: 1.01 }}
          className="relative bg-card border border-border rounded-2xl p-6 md:p-7 shadow-lg shadow-black/5"
        >
          <Sparkles className="absolute top-4 right-4 w-5 h-5 text-primary/20" />
          
          <ul className="space-y-3.5 text-left">
            {items.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -15 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.2 + index * 0.07 }}
                className="flex items-center gap-3"
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                >
                  <Check className="w-3 h-3 text-primary" />
                </motion.div>
                <span className="text-sm font-medium">{item}</span>
              </motion.li>
            ))}
          </ul>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-6 pt-5 border-t border-border"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Everything arrives ready to deploy — no tech headaches, no complicated setup.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
