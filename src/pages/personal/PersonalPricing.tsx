import { motion } from "framer-motion";
import { User, Link2, QrCode, ArrowLeft, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  { icon: User, title: "Pick a username", desc: "Choose your unique tapaway.co/username" },
  { icon: Link2, title: "Add your links and info", desc: "Instagram, TikTok, payments, contact card — all in one place" },
  { icon: QrCode, title: "Share it everywhere", desc: "Text your link, post it in your bio, or use a TapAway card" },
];

const PersonalPricing = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("get_founding_count").then(({ data }) => {
      if (typeof data === "number") setCount(data);
    });
  }, []);

  const spotsLeft = count !== null ? Math.max(1000 - count, 0) : null;

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
          </div>

          {/* Founding urgency badge */}
          {spotsLeft !== null && spotsLeft > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-black text-sm px-4 py-2 font-semibold">
              <Rocket className="h-4 w-4 mr-1.5" />
              {spotsLeft} spots left — Pro free for life
            </Badge>
          )}

          <Button
            onClick={goToSignup}
            size="lg"
            className="w-full h-16 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save My Spot
          </Button>
          <p className="text-xs text-muted-foreground">No credit card · takes 2 min</p>
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

        {/* 3. Social proof strip */}
        {count !== null && count > 0 && (
          <motion.div
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Users className="h-4 w-4" />
            <span>Join {count}+ creators already on TapAway</span>
          </motion.div>
        )}

        {/* 4. Bottom CTA */}
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
            Claim My Free Pro Hub
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Free to start · No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PersonalPricing;
