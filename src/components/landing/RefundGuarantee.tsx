import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Shield } from "lucide-react";

export const RefundGuarantee = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto mt-8 p-6 rounded-xl bg-muted/30 border border-border"
    >
      <div className="flex items-start gap-4">
        <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-lg mb-2">30-Day Guarantee</h3>
          <p className="text-sm text-muted-foreground">
            If you actively use your TapAway cards for 30 days and don't see review activity from customers, we'll refund your subscription. Cards must be in use for this guarantee to apply.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
