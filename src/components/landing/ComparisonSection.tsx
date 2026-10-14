import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import { useRef } from "react";

const comparisonRows = [
  {
    benefit: "Try it before you pay",
    tapaway: "14 days free",
  },
  {
    benefit: "We set it all up for you",
  },
  {
    benefit: "Tap and link activity reporting",
  },
  {
    benefit: "Your whole business in one place",
    plate: "depends on provider",
    qr: "destination depends on setup",
  },
  {
    benefit: "A human when you need help",
  },
  {
    benefit: "Edit your hub anytime",
  },
  {
    benefit: "Cost to start",
    tapaway: "$0",
  },
];

const NegativeCell = ({ detail }: { detail?: string }) => (
  <span className="text-sm text-muted-foreground">{detail || "Depends on provider and setup"}</span>
);

export const ComparisonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-background px-4 py-12 text-foreground md:py-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8 max-w-4xl"
        >
          <h2 className="text-3xl font-black text-foreground md:text-5xl">
            Why businesses switch to TapAway
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            TapAway combines NFC and QR with a managed business hub. Other products vary by provider and setup.
          </p>
        </motion.div>

        <div className="overflow-x-auto" aria-label="TapAway product comparison">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[minmax(280px,2.2fr)_minmax(155px,1fr)_minmax(155px,1fr)_minmax(155px,1fr)] border-b-2 border-border">
              <div aria-hidden="true" />
              <div className="bg-primary/10 px-5 py-5 text-sm font-black uppercase text-primary">
                TapAway
              </div>
              <div className="px-5 py-5 text-sm font-bold uppercase text-muted-foreground">
                One-Time Plate
              </div>
              <div className="px-5 py-5 text-sm font-bold uppercase text-muted-foreground">
                QR Code
              </div>
            </div>

            {comparisonRows.map((row, index) => (
              <motion.div
                key={row.benefit}
                initial={{ opacity: 0, y: 8 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.12 + index * 0.05 }}
                className="grid min-h-16 grid-cols-[minmax(280px,2.2fr)_minmax(155px,1fr)_minmax(155px,1fr)_minmax(155px,1fr)] border-b border-border"
              >
                <div className="flex items-center px-5 py-4 text-base font-medium text-foreground md:text-lg">
                  {row.benefit}
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-5 py-4">
                  <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" strokeWidth={3} />
                  {row.tapaway && <span className="font-bold text-foreground">{row.tapaway}</span>}
                </div>
                <div className="flex items-center px-5 py-4">
                  <NegativeCell detail={row.plate} />
                </div>
                <div className="flex items-center px-5 py-4">
                  <NegativeCell detail={row.qr} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mx-auto mt-7 max-w-4xl text-center text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          iPhone XS, XR, and newer generally read NFC links without a separate app. Older iPhones may need a reader. Android requires an NFC-enabled device with NFC on. Settings and cases can affect tapping. Every card includes a QR fallback.
        </motion.p>
      </div>
    </section>
  );
};