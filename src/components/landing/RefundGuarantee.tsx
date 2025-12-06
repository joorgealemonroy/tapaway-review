import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck } from "lucide-react";

export const RefundGuarantee = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="max-w-xl mx-auto mt-8 mb-4"
    >
      <div className="relative bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base mb-0.5">30-Day Money-Back Guarantee</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use TapAway for 30 days. If you don't see new reviews come in, we'll refund you — no questions asked.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
