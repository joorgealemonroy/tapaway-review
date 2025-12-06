import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { 
    icon: "🟢", 
    value: "3", 
    label: "Active Restaurants",
    sublabel: "Real locations using TapAway daily"
  },
  { 
    icon: "⭐", 
    value: "120+", 
    label: "5-Star Reviews",
    sublabel: "Generated directly from TapAway cards"
  },
  { 
    icon: "🚀", 
    value: "100%", 
    label: "5-Star Rate",
    sublabel: "From guests handed the TapAway card"
  },
  { 
    icon: "⚡", 
    value: "Same-Week", 
    label: "Results",
    sublabel: "Most clients see reviews within days"
  }
];

export const RealisticStats = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section 
      ref={ref} 
      className="py-12 md:py-16 px-4"
      style={{ backgroundColor: '#0B1220' }}
    >
      <div className="max-w-[1060px] mx-auto">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative group cursor-pointer"
            >
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 blur-xl"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.4), rgba(59, 130, 246, 0.4))'
                }}
              />
              
              {/* Card */}
              <div 
                className="relative rounded-xl p-4 md:p-5 text-center border border-white/10 backdrop-blur-sm"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(59, 130, 246, 0.15))',
                }}
              >
                {/* Animated icon */}
                <motion.div 
                  className="text-2xl md:text-3xl mb-2"
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: index * 0.3
                  }}
                >
                  {stat.icon}
                </motion.div>
                
                {/* Value */}
                <div className="text-xl md:text-2xl font-black text-white mb-0.5">
                  {stat.value}
                </div>
                
                {/* Label */}
                <div className="text-sm md:text-base font-semibold text-white/90 mb-1">
                  {stat.label}
                </div>
                
                {/* Sublabel */}
                <div className="text-xs text-white/60 leading-tight">
                  {stat.sublabel}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Live line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 md:mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <motion.span
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{ 
                opacity: [1, 0.4, 1],
                scale: [1, 0.9, 1]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
            <span className="text-sm text-white/70">
              Live reviews coming in from California restaurants using TapAway right now.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
