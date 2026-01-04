import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Palette, Truck, Smartphone } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Palette,
    title: "Choose your design",
    description: "Pick a branded card with your handle or go with a clean, minimal look.",
  },
  {
    number: "02",
    icon: Truck,
    title: "We print + ship in 1–2 business days",
    description: "Your custom NFC card ships fast. Free shipping included.",
  },
  {
    number: "03",
    icon: Smartphone,
    title: "Tap to share your links instantly",
    description: "One tap opens all your links — Instagram, TikTok, payments, and more.",
  },
];

export const PersonalHowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-white">
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
            Three steps to share everything with one tap.
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
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-border" />
              )}

              <div className="relative bg-white rounded-2xl border border-border p-8 hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="text-6xl font-black text-muted/20 absolute top-4 right-4">
                  {step.number}
                </div>

                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>

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
      </div>
    </section>
  );
};
