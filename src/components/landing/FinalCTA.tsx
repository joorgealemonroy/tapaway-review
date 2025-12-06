import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-16 md:py-20 px-4 bg-[#0B1220] text-white">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black mb-4"
        >
          Turn Your Guests Into 5-Star Reviews Automatically
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-white/70 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed"
        >
          TapAway includes your dashboard, setup, and your first batch of custom cards — everything you need to start right away.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a
            href="/paywall"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white text-[#0B1220] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
          >
            Start With December Pricing
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="text-xs text-white/50 mt-4"
        >
          $150 first year • Renews at $300/year • Limited to December availability
        </motion.p>
      </div>
    </section>
  );
};
