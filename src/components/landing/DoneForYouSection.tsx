import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const bullets = [
  "We set up your review + social hub",
  "We ship your NFC cards",
  "We track every tap",
  "We support you ongoing",
];

export const DoneForYouSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-foreground px-4 py-12 text-background md:py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8 text-left"
        >
          <h2 className="mb-3 text-3xl font-black text-background md:text-4xl">
            You don&apos;t lift a finger.
          </h2>
          <p className="text-base text-background/65 md:text-lg">Here&apos;s the deal.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid overflow-hidden rounded-lg border border-background/15 md:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="flex min-h-52 flex-col justify-center border-b border-background/15 px-7 py-8 md:min-h-72 md:border-b-0 md:border-r md:px-10">
            <p className="mb-5 text-xs font-bold uppercase text-background/45">You</p>
            <p className="max-w-52 text-3xl font-black leading-tight text-background md:text-4xl">
              Run your business.
            </p>
            <p className="mt-3 text-base text-background/60">That&apos;s the whole list.</p>
          </div>

          <div className="px-7 py-8 md:px-10">
            <p className="mb-4 text-xs font-bold uppercase text-background/45">We</p>
            <div>
              {bullets.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.08 }}
                  className="flex min-h-13 items-center gap-3 border-b border-background/10 py-4 last:border-b-0"
                >
                  <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" strokeWidth={3} />
                  <p className="text-base font-bold leading-snug text-background">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-center text-sm font-medium text-background/60 md:text-base"
        >
          This is <span className="font-bold text-background">infrastructure</span>, not a gadget.
        </motion.p>
      </div>
    </section>
  );
};