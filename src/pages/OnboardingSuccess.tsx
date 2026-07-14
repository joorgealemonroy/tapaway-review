import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";

const OnboardingSuccess = () => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      {/* Top-left wordmark */}
      <header className="absolute top-0 left-0 px-6 py-4">
        <span className="font-black text-xl tracking-tight">TapAway</span>
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Checkmark icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#111827] border border-white/10"
            >
              <Check className="h-10 w-10 text-blue-400" strokeWidth={2.5} />
            </motion.div>

            <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4 text-white">
              You're in. We'll handle the rest.
            </h1>
            <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-sm mx-auto">
              Our team is building your custom profile. We'll text you to review it shortly.
            </p>

            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => navigate("/dashboard")}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl inline-flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingSuccess;
