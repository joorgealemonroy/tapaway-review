import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X } from "lucide-react";

const tapAwayFeatures = [
  "Free 30-day trial",
  "Done-for-you setup",
  "Monthly review tracking",
  "Multi-link review hub",
  "Cancel anytime",
  "Ongoing support",
];

const competitorMissing = [
  "No tracking",
  "No support",
  "No optimization",
  "Easy to forget",
];

export const ComparisonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Why TapAway Beats One-Time NFC Products
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            One-time NFC plates sit unused. TapAway is infrastructure that actually gets you reviews.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* TapAway Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl border-2 border-primary p-8 shadow-lg shadow-primary/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-black text-lg">T</span>
              </div>
              <h3 className="font-bold text-xl text-foreground">TapAway</h3>
            </div>

            <ul className="space-y-4">
              {tapAwayFeatures.map((feature, i) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Competitor Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card rounded-2xl border border-border p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-muted-foreground font-bold text-lg">?</span>
              </div>
              <h3 className="font-bold text-xl text-muted-foreground">One-Time NFC Plates</h3>
            </div>

            <ul className="space-y-4">
              {competitorMissing.map((issue, i) => (
                <motion.li
                  key={issue}
                  initial={{ opacity: 0, x: 10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <span className="text-muted-foreground">{issue}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
