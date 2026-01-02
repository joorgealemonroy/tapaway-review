import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Smartphone, QrCode, Zap, Clock, TrendingUp, X, Check } from "lucide-react";

const comparisons = [
  {
    feature: "User Action",
    tapaway: "One tap — instant",
    qr: "Open camera → scan → wait",
    tapawayIcon: Zap,
    qrIcon: Clock,
  },
  {
    feature: "Perception",
    tapaway: "Modern & premium",
    qr: "Outdated & clunky",
    tapawayIcon: Check,
    qrIcon: X,
  },
  {
    feature: "Completion Rate",
    tapaway: "Higher engagement",
    qr: "Drop-off friction",
    tapawayIcon: TrendingUp,
    qrIcon: X,
  },
];

export const QRComparisonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Why TapAway Beats QR Codes
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            NFC is faster, easier, and converts better than outdated QR codes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* TapAway Card */}
          <div className="bg-white rounded-2xl border-2 border-primary p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-background text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMMENDED
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">TapAway NFC</h3>
                <p className="text-sm text-muted-foreground">One-tap simplicity</p>
              </div>
            </div>
            <ul className="space-y-4">
              {comparisons.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.feature}</p>
                    <p className="text-sm text-muted-foreground">{item.tapaway}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl border border-border p-8 opacity-75">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <QrCode className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">QR Codes</h3>
                <p className="text-sm text-muted-foreground">Multi-step friction</p>
              </div>
            </div>
            <ul className="space-y-4">
              {comparisons.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.feature}</p>
                    <p className="text-sm text-muted-foreground">{item.qr}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          NFC works on all iPhones (7+) and most Android phones — no app required.
        </motion.p>
      </div>
    </section>
  );
};
