import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export const RiskReversalSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Shield Icon */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-6">
            Try TapAway Risk-Free
          </h2>

          <div className="space-y-4 mb-8 max-w-xl mx-auto">
            <p className="text-xl text-muted-foreground leading-relaxed">
              Use TapAway for <span className="font-semibold text-foreground">30 full days</span> — completely free.
            </p>
            <ul className="text-base text-muted-foreground space-y-3">
              <li className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                No charges during your trial period
              </li>
              <li className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                Cancel anytime before day 30 to avoid billing
              </li>
              <li className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                Card on file keeps your service running after trial
              </li>
            </ul>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Link
              to="/start"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold text-lg shadow-lg shadow-foreground/20 hover:shadow-xl transition-all"
            >
              Start Free 30-Day Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <p className="text-sm text-muted-foreground mt-6">
            After trial: $30/month • Cancel with one click
          </p>
        </motion.div>
      </div>
    </section>
  );
};
