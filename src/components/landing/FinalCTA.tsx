import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-16 md:py-20 px-4 bg-[#0B1220] text-white relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black mb-4"
        >
          Turn Your Happy Guests Into 5-Star Reviews — Starting This Week
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-white/70 text-sm md:text-base mb-8 max-w-md mx-auto"
        >
          Includes cards, dashboard & setup. Limited December spots.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a
            href="/paywall"
            className="inline-flex items-center px-8 py-4 rounded-xl font-bold bg-white text-[#0B1220] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
          >
            Start December Special
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="text-xs text-white/50 mt-4"
        >
          $150 first year • Renews at $300/year
        </motion.p>
      </div>
    </section>
  );
};
