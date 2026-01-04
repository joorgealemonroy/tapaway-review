import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
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
          Ready to share everything with one tap?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-background/70 text-lg mb-8"
        >
          Get your personal TapAway card and start connecting instantly.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to="/personal/order"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get Your Personal TapAway Card
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-background/50 text-sm mt-6"
        >
          Free shipping. Change your links anytime. No subscription required.
        </motion.p>
      </div>
    </section>
  );
};
