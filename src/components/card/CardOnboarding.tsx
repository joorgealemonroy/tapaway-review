import { lazy, Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, UserPlus, BarChart3, Zap, Palette, Send, ChevronDown, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const HubShowcase = lazy(() => import("./HubShowcase").then(m => ({ default: m.HubShowcase })));

interface Props {
  onActivate: () => void;
}

const BENEFITS = [
  {
    icon: Share2,
    title: "Share everything with one tap",
    desc: "All your links, socials, and payment apps — one page, always up to date.",
  },
  {
    icon: UserPlus,
    title: "Let anyone save your contact instantly",
    desc: "One button adds your name, phone, and email straight to their phone. No app needed.",
  },
  {
    icon: BarChart3,
    title: "See who's checking you out",
    desc: "Track views, taps, and which links get clicked — upgrade to Pro for full analytics.",
  },
];

const STEPS = [
  { icon: Zap, title: "Activate your card", desc: "Enter your email and create a password" },
  { icon: Palette, title: "Make it yours", desc: "Add your links, photo, and pick a style" },
  { icon: Send, title: "Start sharing", desc: "Tap your card, text your link, or show your QR" },
];

export const CardOnboarding = ({ onActivate }: Props) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tapaway_dashboard_theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tapaway_dashboard_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const ActivateButton = ({ className = "" }: { className?: string }) => (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 2, repeat: 2, ease: "easeInOut" }}
    >
      <Button
        onClick={onActivate}
        size="lg"
        className={`w-full h-14 text-lg font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 ${className}`}
      >
        Activate My Card
      </Button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 h-9 w-9 rounded-full"
        onClick={() => setIsDark(!isDark)}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <div className="max-w-sm mx-auto px-6 py-10 space-y-12">
        {/* 1. Hero */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mx-auto w-60 aspect-[1.586/1] rounded-2xl shadow-2xl shadow-teal-500/20 dark:shadow-teal-400/10 flex items-center justify-center"
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
              style={{
                fontFamily: "'League Spartan', sans-serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              className="text-white text-xl font-bold tracking-tight select-none"
            >
              tapaway.co
            </span>
          </motion.div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              You just got a smart card
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Tap it. Your page opens. All your links, one place.
            </p>
          </div>

          <ActivateButton />

          <p className="text-xs text-muted-foreground">
            Free · 3 minutes · No app needed
          </p>

          <button
            onClick={() => document.getElementById("benefits")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            See what you can do
            <ChevronDown className="h-3 w-3 animate-bounce" />
          </button>
        </motion.div>

        {/* 2. Benefits */}
        <motion.section
          id="benefits"
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-2xl border border-border bg-card"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </motion.section>

        {/* 3. HubShowcase (Pro social proof) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Suspense fallback={<div className="h-48" />}>
            <HubShowcase onCopyLayout={onActivate} />
          </Suspense>
        </motion.div>

        {/* 4. How to Get Started */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">How to Get Started</h2>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
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

        {/* 5. Mid CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <ActivateButton />
        </motion.div>

        {/* 6. Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="pb-20"
        >
          <ActivateButton />
          <p className="text-xs text-muted-foreground text-center mt-3">
            Free to start · No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
};
