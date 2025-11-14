import { motion } from "framer-motion";

export const NewHero = () => {
  return (
    <section className="min-h-screen bg-black flex items-center justify-center px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-[clamp(40px,10vw,80px)] font-black text-white leading-[1.1] mb-6">
            Less Work.<br />
            More Reviews.<br />
            More Customers.
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-[clamp(16px,4vw,20px)] text-gray-300 max-w-2xl mx-auto mb-8"
        >
          Stop chasing reviews. TapAway turns your happy customers into 5-star reviews automatically — no awkward asks, no extra work.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 px-8 py-5 rounded-full font-bold bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:shadow-[0_30px_70px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-lg"
          >
            Start Getting Reviews
          </a>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="text-sm text-gray-400 mt-6"
        >
          Custom NFC card + setup included. No hidden fees.
        </motion.p>
      </div>
    </section>
  );
};
