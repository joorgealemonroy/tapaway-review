import { motion } from "framer-motion";

export const NewHero = () => {
  return (
    <section className="min-h-[85vh] md:min-h-screen bg-black flex items-center justify-center px-4 py-12 md:py-16">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-[clamp(36px,9vw,72px)] font-black text-white leading-[1.1] mb-4 md:mb-6">
            Less Work.<br />
            More 5-Star Reviews.<br />
            More Customers.
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-[clamp(15px,3.5vw,18px)] text-gray-300 max-w-xl mx-auto mb-6 leading-relaxed px-2"
        >
          TapAway helps restaurants turn happy guests into real 5-star Google reviews — without awkward asking or slowing down service.
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-xs md:text-sm text-gray-500 mb-5"
        >
          Used by real dine-in restaurants in California
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <a
            href="/paywall"
            className="inline-flex items-center gap-2 px-7 py-4 md:px-8 md:py-5 rounded-full font-bold bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:shadow-[0_30px_70px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-base md:text-lg"
          >
            Start December Special
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="text-xs md:text-sm text-gray-500 mt-3"
        >
          $150 first year · Normally $300/year · Limited to December only
        </motion.p>
      </div>
    </section>
  );
};
