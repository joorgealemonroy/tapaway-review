import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X } from "lucide-react";

export const WhoItsFor = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const forList = [
    "Dine-in restaurants",
    "Bars & cafés with table service",
    "Service-first businesses where guests experience service before paying"
  ];

  const notForList = [
    "Online-only businesses",
    "Drive-through only restaurants",
    "Businesses with no in-person guest interaction"
  ];

  return (
    <section ref={ref} className="py-12 md:py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-8"
        >
          Is TapAway Right For You?
        </motion.h2>
        
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {/* Who It's For */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white rounded-xl p-5 md:p-6 border border-border shadow-sm"
          >
            <h3 className="text-base md:text-lg font-bold mb-4 text-primary">Who TapAway Is For</h3>
            <ul className="space-y-3">
              {forList.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Who It's NOT For */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="bg-white rounded-xl p-5 md:p-6 border border-border shadow-sm"
          >
            <h3 className="text-base md:text-lg font-bold mb-4 text-muted-foreground">Who TapAway Is NOT For</h3>
            <ul className="space-y-3">
              {notForList.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
