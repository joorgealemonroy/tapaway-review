import { Check, Mail } from "lucide-react";
import { motion } from "framer-motion";

const RepCheckoutSuccess = () => {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">
      {/* Simple brand header */}
      <nav className="border-b border-white/5 bg-[#0a0e1a]/90 backdrop-blur-lg">
        <div className="max-w-md mx-auto px-4 py-3">
          <span className="font-black text-xl tracking-tight">TapAway</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>

          <h1 className="text-3xl font-black mb-3">Payment Successful! 🎉</h1>

          <p className="text-gray-300 mb-6 leading-relaxed">
            Your TapAway subscription is active and your cards are being prepared.
          </p>

          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-lg">Check Your Email</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              We've sent you an email with a link to set up your password and access your dashboard.
              Your cards will ship in 1–2 business days.
            </p>
          </div>

          <p className="text-gray-600 text-xs">
            Questions? Email us at{" "}
            <a href="mailto:support@tapaway.co" className="text-blue-400 hover:underline">
              support@tapaway.co
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default RepCheckoutSuccess;
