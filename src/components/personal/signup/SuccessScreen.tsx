import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPublicProfileUrl } from "@/lib/personalUsername";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";

interface Props {
  username: string;
  planType?: "free" | "monthly" | "yearly" | "vip";
}

/* Animated SVG checkmark — draws itself in */
const AnimatedCheck = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
    className="relative mx-auto"
  >
    {/* Outer glow */}
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [0, 0.5, 0.2], scale: [0.8, 1.3, 1.2] }}
      transition={{ duration: 1.5, delay: 0.3 }}
      className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
      style={{ width: 96, height: 96 }}
    />
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="relative z-10">
      {/* Circle */}
      <motion.circle
        cx="48" cy="48" r="44"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      />
      {/* Checkmark */}
      <motion.path
        d="M30 50 L42 62 L66 36"
        stroke="hsl(var(--primary))"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
      />
    </svg>
  </motion.div>
);

const PLATFORMS = [
  { name: "Instagram", icon: "https://cdn.simpleicons.org/instagram/E4405F" },
  { name: "TikTok", icon: "https://cdn.simpleicons.org/tiktok/000000" },
  { name: "X", icon: "https://cdn.simpleicons.org/x/000000" },
  { name: "LinkedIn", icon: "https://cdn.simpleicons.org/linkedin/0A66C2" },
];

export const SuccessScreen = ({ username, planType = "yearly" }: Props) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const profileUrl = getPublicProfileUrl(planType, username);
  const shortUrl = profileUrl.replace(/^https?:\/\//, "");

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4">
          <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
            TapAway
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-16 flex flex-col items-center">
        {/* Checkmark */}
        <AnimatedCheck />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-8 text-3xl font-bold tracking-tight text-foreground text-center"
        >
          You're in.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.5 }}
          className="mt-2 text-muted-foreground text-center text-base"
        >
          Your TapAway is live and ready to share.
        </motion.p>

        {/* Profile Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="w-full mt-10"
        >
          <button
            onClick={copyToClipboard}
            className="w-full group relative flex items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-all duration-200"
          >
            <span className="font-mono text-sm text-foreground truncate">
              {shortUrl}
            </span>
            <span className="flex-shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-primary" />
              )}
            </span>
          </button>
        </motion.div>

        {/* Add to Bio Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="w-full mt-6 p-5 rounded-2xl bg-muted/40 border border-border/50"
        >
          <p className="text-sm font-semibold text-foreground mb-1">
            Add it to your bio
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Paste your link so followers can find everything in one tap.
          </p>
          <div className="flex items-center gap-4 justify-center">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-1.5">
                <div className="h-11 w-11 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm">
                  <img
                    src={p.icon}
                    alt={p.name}
                    className="h-5 w-5 dark:invert"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{p.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
          className="w-full mt-10 space-y-3"
        >
          <Button
            onClick={() => window.open(profileUrl, "_blank")}
            className="w-full h-14 text-base font-semibold rounded-xl"
          >
            View Your Profile
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                navigate("/personal/dashboard?welcome=true");
              } else {
                navigate("/auth?redirect=/personal/dashboard?welcome=true");
              }
            }}
            className="w-full h-12 text-sm text-muted-foreground"
          >
            Go to Dashboard
          </Button>
        </motion.div>
      </main>
    </div>
  );
};
