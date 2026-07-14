import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Package, Send, BarChart3, Headphones, CheckCircle } from "lucide-react";

const bullets = [
  {
    icon: Package,
    text: "We set up your review + social hub",
  },
  {
    icon: Send,
    text: "We ship your NFC cards",
  },
  {
    icon: BarChart3,
    text: "We track every tap",
  },
  {
    icon: Headphones,
    text: "We support you ongoing",
  },
];

export const DoneForYouSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3">
            You Don't Lift a Finger.
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            We handle everything so you can focus on running your business.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {bullets.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{item.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-8 font-medium"
        >
          This is <span className="text-foreground">infrastructure</span>, not a gadget.
        </motion.p>
      </div>
    </section>
  );
};