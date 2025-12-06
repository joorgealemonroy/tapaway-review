import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
const stats = [{
  emoji: "✅",
  value: "3",
  label: "Active Restaurant Locations"
}, {
  emoji: "⭐",
  value: "120+",
  label: "Reviews Generated with TapAway"
}, {
  emoji: "🔥",
  value: "100%",
  label: "of TapAway reviews are 5-star"
}, {
  emoji: "⚡",
  value: "Same-week",
  label: "results reported by all clients"
}];
export const RealisticStats = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px"
  });
  return <section ref={ref} className="pt-0 pb-10 md:pb-12 overflow-hidden" style={{
    backgroundColor: '#0B1220'
  }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, index) => <motion.div key={index} initial={{
          opacity: 0,
          y: 20,
          scale: 0.95
        }} animate={isInView ? {
          opacity: 1,
          y: 0,
          scale: 1
        } : {}} transition={{
          duration: 0.4,
          delay: index * 0.08
        }} whileHover={{
          y: -4
        }} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan-500/10 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#0F1A2A] to-[#0B1220] border border-white/10 rounded-xl p-4 text-center hover:border-primary/30 transition-all">
                <motion.div className="text-xl mb-1.5" animate={{
              scale: [1, 1.15, 1]
            }} transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.3
            }}>
                  {stat.emoji}
                </motion.div>
                <div className="text-xl md:text-2xl font-black text-white mb-0.5">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 leading-tight">
                  {stat.label}
                </div>
              </div>
            </motion.div>)}
        </div>
        
        <motion.div initial={{
        opacity: 0
      }} animate={isInView ? {
        opacity: 1
      } : {}} transition={{
        duration: 0.5,
        delay: 0.4
      }} className="flex items-center justify-center gap-2 mt-6">
          
          
        </motion.div>
      </div>
    </section>;
};