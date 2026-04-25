import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const STEPS = [
  "We'll send you a text shortly to say hello and get any final details.",
  "We'll build a stunning, high-converting digital profile for you.",
  "Once you give us the thumbs up, we print and ship your NFC cards!",
];

const OnboardingSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">
      {/* Minimal wordmark, no nav */}
      <div className="pt-6 pb-2 text-center">
        <span className="font-black text-xl tracking-tight">TapAway</span>
      </div>

      <main className="flex-1 flex items-start sm:items-center justify-center px-5 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 shadow-[0_0_60px_rgba(59,130,246,0.08)]">
            {/* VIP pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 mb-5"
            >
              ✦ VIP Onboarding
            </motion.div>

            <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">
              🎉 You're on the VIP List!
            </h1>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Sit tight! Our design team is reviewing your logo and building your custom TapAway profile right now.
            </p>

            <div className="space-y-4 mb-6">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                What happens next
              </p>
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed pt-1">{step}</p>
                </motion.div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-5 mt-2">
              <p className="text-center text-sm text-gray-400 font-medium">
                No action needed from you today.
              </p>
            </div>
          </div>

          {/* Subtle dashboard escape hatch */}
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full mt-6 text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-2 inline-flex items-center justify-center gap-1.5"
          >
            Go to Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default OnboardingSuccess;
