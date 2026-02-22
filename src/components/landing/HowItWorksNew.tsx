import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Package, Smartphone, Star } from "lucide-react";
import TapAwayCard3D from "@/components/TapAwayCard3D";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "We install TapAway for free",
    description: "We ship your NFC cards and set up your custom review page — all done for you.",
  },
  {
    number: "02",
    icon: Smartphone,
    title: "Customers tap → leave reviews in seconds",
    description: "One tap opens your review page. No apps, no passwords, no friction.",
  },
  {
    number: "03",
    icon: Star,
    title: "You get more 5-star reviews automatically",
    description: "Watch your Google rating climb while we track every tap and review.",
  },
];

export const HowItWorksNew = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Three simple steps to more 5-star reviews.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.15 }}
              className="relative"
            >
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-border" />
              )}

              <div className="relative bg-card rounded-2xl border border-border p-8 hover:border-primary/30 hover:shadow-lg transition-all">
                {/* Step Number */}
                <div className="text-6xl font-black text-muted/20 absolute top-4 right-4">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Micro-copy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-muted-foreground mt-12 text-sm"
        >
          No apps. No passwords. No staff training.
        </motion.p>

        {/* Rotating NFC Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12"
        >
          <TapAwayCard3D />
        </motion.div>
      </div>
    </section>
  );
};
