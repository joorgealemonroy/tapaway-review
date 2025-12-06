import { motion } from "framer-motion";

export const NewHero = () => {
  return (
    <section className="min-h-[90vh] bg-[#0B1220] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Subtle glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(32px,8vw,56px)] font-black text-white leading-[1.1] mb-5"
        >
          More 5-Star Reviews.<br />
          <span className="text-primary">Without the Awkward Ask.</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[clamp(16px,3.5vw,20px)] text-gray-300 max-w-xl mx-auto mb-5 leading-relaxed"
        >
          Your staff hands happy guests a TapAway card. One tap later — real Google reviews start coming in.
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-sm text-gray-500 mb-8"
        >
          Used by real dine-in restaurants in California
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <a
            href="/paywall"
            className="inline-flex items-center px-8 py-4 rounded-full font-bold bg-primary text-primary-foreground shadow-[0_0_40px_rgba(11,165,164,0.3)] hover:shadow-[0_0_60px_rgba(11,165,164,0.4)] hover:scale-105 transition-all text-lg"
          >
            Start December Special
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="text-sm text-gray-500 mt-4"
        >
          $150 first year · Normally $300/year · December only
        </motion.p>
      </div>
    </section>
  );
};
