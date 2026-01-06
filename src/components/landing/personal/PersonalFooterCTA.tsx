import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Truck, Package } from "lucide-react";
import { Link } from "react-router-dom";

export const PersonalFooterCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-foreground text-background">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-black mb-4"
        >
          Get your custom NFC card
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-background/70 text-lg mb-6"
        >
          We design, print, and ship your personalized TapAway card — all set up for you.
        </motion.p>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap gap-4 justify-center text-sm text-background/60 mb-8"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>Free shipping</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Ships in 1-2 days</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to="/personal/pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get Your Custom NFC Card
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-background/50 text-sm mt-6"
        >
          Starting at $99/year — or try free without a card
        </motion.p>
      </div>
    </section>
  );
};
