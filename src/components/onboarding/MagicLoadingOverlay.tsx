import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Locating your Google Business Profile…",
  "Fetching your brand colors and logo…",
  "Pulling recent social media images…",
  "Designing your custom Tapaway hub…",
];

interface MagicLoadingOverlayProps {
  isVisible: boolean;
}

export const MagicLoadingOverlay = ({ isVisible }: MagicLoadingOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col items-center justify-center px-6"
    >
      {/* Animated logo area */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.3)]">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      {/* Cycling text */}
      <div className="h-16 flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="text-white text-lg font-medium text-center max-w-xs"
          >
            {STEPS[currentStep]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-64 max-w-full">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="text-gray-500 text-xs text-center mt-3">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Subtle shimmer dots */}
      <div className="absolute bottom-12 flex gap-2">
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${i <= currentStep ? 'bg-blue-500' : 'bg-white/10'}`}
            animate={i === currentStep ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  );
};
