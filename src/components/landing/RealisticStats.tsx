import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "3", label: "Active Restaurant Locations" },
  { value: "120+", label: "Reviews Generated With TapAway" },
  { value: "100%", label: "TapAway reviews are 5-star" },
  { value: "Same-week", label: "Results reported by clients" }
];

export const RealisticStats = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="max-w-[1060px] mx-auto px-4 py-8 md:py-10">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="bg-white rounded-xl p-4 border border-border shadow-sm text-center"
          >
            <div className="text-lg md:text-xl font-black text-primary mb-0.5">{stat.value}</div>
            <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
