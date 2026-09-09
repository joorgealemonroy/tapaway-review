import { motion } from "framer-motion";
import { User, Link2, QrCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PERSONAL_PRICING } from "@/lib/personalConfig";

const STEPS = [
  { icon: User, title: "Pick a username", desc: "Choose your unique tapaway.co/username" },
  { icon: Link2, title: "Add your links and info", desc: "Instagram, TikTok, payments, contact card — all in one place" },
  { icon: QrCode, title: "Share it everywhere", desc: "Text your link, post it in your bio, or use a TapAway card" },
];

const PersonalPricing = () => {
  const navigate = useNavigate();

  const goToSignup = () => navigate("/personal/signup");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="max-w-sm mx-auto px-6 py-10 space-y-12">
        {/* Back */}
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="-ml-2 -mt-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* 1. Hero */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mx-auto w-56 aspect-[1.586/1] rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center"
            animate={{
              backgroundColor: ["#10B981", "#EC4899", "#EF4444", "#9CA3AF", "#EAB308"],
              y: [0, -6, 0],
            }}
            transition={{
              backgroundColor: { duration: 12, repeat: Infinity, ease: "linear" },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <span
              style={{ fontFamily: "'League Spartan', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
              className="text-white text-xl font-bold tracking-tight select-none"
            >
              tapaway.co
            </span>
          </motion.div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              All Your Links,<br />One TapAway
            </h1>
            <p className="text-muted-foreground mt-2">Starting at ${PERSONAL_PRICING.monthly}/month — or ${PERSONAL_PRICING.yearly}/year and save ${PERSONAL_PRICING.monthly * 12 - PERSONAL_PRICING.yearly}</p>
          </div>

          <Button
            onClick={goToSignup}
            size="lg"
            className="w-full h-16 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Get Started
          </Button>
        </motion.div>

        {/* 2. How It Works */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">How It Works</h2>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 3. Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pb-20"
        >
          <Button
            onClick={goToSignup}
            size="lg"
            className="w-full h-16 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PersonalPricing;