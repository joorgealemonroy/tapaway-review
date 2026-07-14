import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";

const STEPS = [
  "We build your profile.",
  "You approve the design via text.",
  "Your NFC cards ship.",
];

const OnboardingSuccess = () => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      {/* Top-left wordmark, separate from centered content */}
      <header className="absolute top-0 left-0 px-6 py-4">
        <span className="font-black text-xl tracking-tight">TapAway</span>
      </header>

      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Concierge pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 mb-5"
          >
            ✦ Concierge Build
          </motion.div>

          {/* Premium hero visual */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Sparkles className="w-16 h-16 text-cyan-400 mx-auto mb-5 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-center">
            You're in! Let our design team take it from here.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-sm mx-auto text-center">
            We are manually building your custom digital profile so it looks perfect. We'll text you shortly to review your design before we program and ship your physical cards.
          </p>

          {/* Centered checklist with left-aligned items */}
          <div className="max-w-xs mx-auto mb-8 text-left">
            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-3 text-center">
              What happens next
            </p>
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-200 leading-relaxed pt-0.5">{step}</p>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={() => navigate("/dashboard")}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl inline-flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(37,99,235,0.35)]"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};

export default OnboardingSuccess;
