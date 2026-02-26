import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPublicUsername } from "@/lib/personalUsername";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";

interface Props {
  username: string;
  planType?: "free" | "monthly" | "yearly" | "vip";
}

/* ── Inline platform SVG icons ── */
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const PLATFORMS = [
  { name: "Instagram", Icon: InstagramIcon },
  { name: "TikTok", Icon: TikTokIcon },
  { name: "X", Icon: XIcon },
  { name: "LinkedIn", Icon: LinkedInIcon },
];

/* ── Animated sparkle (4-point star) ── */
const AnimatedSparkle = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0, rotate: -30 }}
    animate={{ scale: 1, opacity: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
    className="relative mx-auto flex items-center justify-center"
    style={{ width: 72, height: 72 }}
  >
    {/* Glow */}
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.5, 0.2], scale: [0.5, 1.6, 1.4] }}
      transition={{ duration: 1.5, delay: 0.2 }}
      className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
    />
    {/* Star */}
    <motion.svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      className="relative z-10"
      animate={{ rotate: [0, 8, 0, -8, 0], scale: [1, 1.06, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.path
        d="M32 0L39.5 24.5L64 32L39.5 39.5L32 64L24.5 39.5L0 32L24.5 24.5L32 0Z"
        fill="hsl(var(--primary))"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
    </motion.svg>
  </motion.div>
);

export const SuccessScreen = ({ username, planType = "yearly" }: Props) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const publicUsername = getPublicUsername(planType as any, username);
  const displayUrl = `tapaway.co/${publicUsername}`;
  const fullUrl = `https://${displayUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background:
          "radial-gradient(ellipse at 50% 25%, hsl(var(--primary) / 0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, hsl(var(--primary) / 0.03) 0%, hsl(var(--background)) 70%)",
      }}
    >
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Sparkle */}
        <AnimatedSparkle />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-3xl font-bold tracking-tight text-foreground text-center"
        >
          Welcome to TapAway
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-2 text-muted-foreground text-center text-base"
        >
          Your profile is live and ready to share.
        </motion.p>

        {/* Profile Link Card with shimmer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.5 }}
          className="w-full mt-8 relative"
        >
          {/* Shimmer border overlay */}
          <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1.5, delay: 1.4, ease: "easeInOut" }}
              className="absolute inset-0 w-1/2"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)",
              }}
            />
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full group relative flex items-center justify-between gap-3 p-5 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg shadow-black/[0.03] dark:shadow-black/20 hover:shadow-xl transition-all duration-300"
          >
            <span className="font-mono text-base text-foreground tracking-tight truncate">
              {displayUrl}
            </span>
            <span className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-200">
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
          transition={{ delay: 1.1, duration: 0.5 }}
          className="w-full mt-5 p-6 rounded-2xl bg-gradient-to-br from-primary/[0.04] to-primary/[0.08]"
        >
          <p className="text-sm font-semibold text-foreground mb-1">
            Add it to your bio
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            Paste your link so followers can find everything in one tap.
          </p>
          <div className="flex items-center gap-5 justify-center">
            {PLATFORMS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 1.3 + i * 0.08,
                }}
                className="flex flex-col items-center gap-1.5 group/icon"
              >
                <div className="h-12 w-12 rounded-xl bg-background/80 dark:bg-background/50 flex items-center justify-center shadow-sm text-muted-foreground group-hover/icon:text-foreground group-hover/icon:scale-110 group-hover/icon:shadow-md group-hover/icon:shadow-primary/10 transition-all duration-200">
                  <p.Icon />
                </div>
                <span className="text-[10px] text-muted-foreground">{p.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="w-full mt-10 space-y-3"
        >
          <Button
            onClick={() => window.open(fullUrl, "_blank")}
            className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
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
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
