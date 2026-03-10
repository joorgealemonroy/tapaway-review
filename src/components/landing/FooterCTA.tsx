import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const FooterCTA = () => {
  return (
    <section className="py-24 px-4 bg-foreground text-background">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-black mb-6"
        >
          Ready to Get More 5-Star Reviews?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl text-background/70 mb-10"
        >
          Start your free 30-day trial today. No charge during the trial. Cancel anytime.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-block"
        >
          <Link
            to="/start"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Start My Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm text-background/50 mt-6"
        >
          Limited free installs available each month.
        </motion.p>
      </div>
    </section>
  );
};
