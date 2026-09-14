import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import mockupsAsset from "@/assets/tapaway-phone-mockups.png.asset.json";

export const RiskReversalSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const bullets = [
    "Cards designed, printed & shipped to you",
    "Your hub built and live within days",
    "No charge until day 14 — cancel anytime",
  ];

  return (
    <section ref={ref} className="bg-[#0a0f1c] py-16 md:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16 items-center"
        >
          {/* Left column: text */}
          <div className="text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
              START FREE
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              Your first 14 days are on us.
            </h2>
            <p className="text-base md:text-lg text-white/70 mb-6 leading-relaxed max-w-xl mx-auto md:mx-0">
              4 custom cards with your logo, your hub built for you, and the full dashboard — free for 14 days.
            </p>

            <ul className="space-y-3 mb-8 text-left max-w-md mx-auto md:mx-0">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={3} />
                  <span className="text-sm md:text-base text-white/90">{bullet}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/start"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[#0a0f1c] font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start My Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-xs md:text-sm text-white/50 mt-4">
              Card on file required · $1 hold, voided instantly · Cancel anytime.
            </p>
          </div>

          {/* Right column: image */}
          <div className="flex items-center justify-center">
            <motion.img
              src={mockupsAsset.url}
              alt="TapAway phone mockups showing example business hubs"
              className="w-full max-h-[520px] md:max-h-[640px] object-contain"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
