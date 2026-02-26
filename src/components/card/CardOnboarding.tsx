import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Smartphone, Globe, UserPlus, Zap, Palette, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const HubShowcase = lazy(() => import("./HubShowcase").then(m => ({ default: m.HubShowcase })));
const LayoutTemplates = lazy(() => import("./LayoutTemplates").then(m => ({ default: m.LayoutTemplates })));

interface Props {
  onActivate: () => void;
}

const INFO_CARDS = [
  {
    icon: Smartphone,
    title: "It's a smart card",
    desc: "This card has a tiny chip inside. When someone holds their phone near it, your personal hub opens instantly — no app needed.",
  },
  {
    icon: Globe,
    title: "Your hub, your rules",
    desc: "Your hub is a single page with all your links, social profiles, photos, and contact info. Update it anytime — your card always points to the latest version.",
  },
  {
    icon: UserPlus,
    title: "One-tap contact saving",
    desc: "Anyone who visits your hub can save your name, phone, and email straight to their contacts with one button. They don't need an account or an app.",
  },
];

const STEPS = [
  { icon: Zap, title: "Activate your card", desc: "Enter your email and set a password" },
  { icon: Palette, title: "Pick a layout or copy one", desc: "Start from a template or copy a hub you like" },
  { icon: Send, title: "Share it everywhere", desc: "Tap your card, text your link, or show your QR code" },
];

export const CardOnboarding = ({ onActivate }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      <div className="max-w-sm mx-auto px-6 py-10 space-y-10">
        {/* 1. Hero */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mx-auto w-56 aspect-[1.586/1] rounded-2xl shadow-2xl shadow-teal-200/50 flex items-center justify-center"
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
              Your card is ready
            </h1>
            <p className="text-muted-foreground mt-1">
              Takes about 3 minutes. Free. No app needed.
            </p>
          </div>

          <Button
            onClick={onActivate}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Activate Now
          </Button>

          <button
            onClick={() => document.getElementById("hub-showcase")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Scroll to see examples
            <ChevronDown className="h-3 w-3 animate-bounce" />
          </button>
        </motion.div>

        {/* 2. Real Hubs (social proof first) */}
        <motion.div
          id="hub-showcase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Suspense fallback={<div className="h-48" />}>
            <HubShowcase onCopyLayout={onActivate} />
          </Suspense>
        </motion.div>

        {/* 3. How to Get Started (brief) */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
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

        {/* 4. Mid-page CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Button
            onClick={onActivate}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Activate Now
          </Button>
        </motion.div>

        {/* 5. Layout Templates */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Suspense fallback={<div className="h-48" />}>
            <LayoutTemplates onSelect={() => {}} />
          </Suspense>
        </motion.div>

        {/* 6. What Is This Card? (educational, for those who need it) */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">What Is This Card?</h2>
          <div className="space-y-3">
            {INFO_CARDS.map((card, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-2xl border border-border bg-card"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <card.icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 7. Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="pb-20"
        >
          <Button
            onClick={onActivate}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Activate Now
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Free to start · No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
};
