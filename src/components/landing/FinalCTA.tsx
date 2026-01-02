import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-16 md:py-20 px-4 bg-[#0B1220] text-white relative overflow-hidden">
      {/* Animated gradient glow */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-[#0B1220]/50" />
      
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black mb-3"
        >
          Turn Your Happy Guests Into 5-Star Reviews — Starting This Week
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-white/60 text-sm md:text-base mb-8 max-w-md mx-auto"
        >
          Includes cards, dashboard, and setup. December spots are limited.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link to="/paywall">
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white text-[#0B1220] shadow-lg text-base"
              whileHover={{ scale: 1.03, boxShadow: "0 20px 40px -10px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.98 }}
            >
              Start Free 30-Day Trial
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="text-xs text-white/40 mt-5"
        >
          No charge today • Cancel anytime before day 30
        </motion.p>
      </div>
    </section>
  );
};
