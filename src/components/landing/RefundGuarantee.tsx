import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Shield } from "lucide-react";

export const RefundGuarantee = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto mt-6 p-4 md:p-5 rounded-xl bg-muted/30 border border-border"
    >
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm mb-1">30-Day Guarantee</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you actively use TapAway for 30 days and don't see new reviews come in, we'll refund you.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
