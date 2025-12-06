import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-black text-white">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-black mb-6"
        >
          Turn Your Guests Into 5-Star Reviews Automatically
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <a
            href="/paywall"
            className="inline-flex items-center gap-2 px-8 py-5 rounded-full font-bold bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:shadow-[0_30px_70px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-lg"
          >
            Start December Special
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-sm text-gray-400 mt-4"
        >
          Includes cards, dashboard & setup.
        </motion.p>
      </div>
    </section>
  );
};
