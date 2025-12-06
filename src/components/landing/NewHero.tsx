import { motion } from "framer-motion";
export const NewHero = () => {
  return <section className="bg-[#0B1220] flex items-center justify-center px-4 pt-20 pb-12 md:pt-24 md:pb-16 relative overflow-hidden">
      {/* Animated gradient glow effects */}
      <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl" animate={{
      scale: [1, 1.2, 1],
      opacity: [0.15, 0.25, 0.15]
    }} transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }} />
      <motion.div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" animate={{
      scale: [1.2, 1, 1.2],
      opacity: [0.1, 0.2, 0.1]
    }} transition={{
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h1 initial={{
        opacity: 0,
        y: 24
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} className="text-[clamp(32px,8vw,56px)] font-black text-white leading-[1.1] mb-5">
          More 5-Star Reviews.<br />
          <span className="text-primary">Without the Awkward Ask.</span>
        </motion.h1>
        
        <motion.p initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.15
      }} className="text-[clamp(15px,3.5vw,18px)] text-gray-300 max-w-lg mx-auto mb-6 leading-relaxed">
          Simply hand the card to a happy guest. One tap later — reviews, social follows, and real traffic start coming in.
        </motion.p>
        
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.3
      }} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <motion.a href="/paywall" className="inline-flex items-center px-7 py-3.5 rounded-full font-bold bg-primary text-primary-foreground shadow-[0_0_30px_rgba(11,165,164,0.35)] text-base" whileHover={{
          scale: 1.03,
          boxShadow: "0 0 50px rgba(11,165,164,0.5)"
        }} whileTap={{
          scale: 0.98
        }}>
            Start Getting Reviews
          </motion.a>
          
        </motion.div>
        
        <motion.p initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.4,
        delay: 0.5
      }} className="text-xs text-gray-500">
          $150 first year · Normally $300/year · December only
        </motion.p>
        
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.4,
        delay: 0.6
      }} className="flex items-center justify-center gap-2 mt-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-gray-500">Used by real dine-in restaurants across the United States</span>
        </motion.div>
      </div>
    </section>;
};