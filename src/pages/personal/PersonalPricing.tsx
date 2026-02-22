import { motion } from "framer-motion";
import { Globe, UserPlus, Share2, ChevronDown, User, Link2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubShowcase } from "@/components/card/HubShowcase";
import { LayoutTemplates } from "@/components/card/LayoutTemplates";
import { useNavigate } from "react-router-dom";

const INFO_CARDS = [
  {
    icon: Globe,
    title: "All your links in one place",
    desc: "Your hub is a single page with all your links, social profiles, photos, and contact info. Update it anytime.",
  },
  {
    icon: UserPlus,
    title: "One-tap contact saving",
    desc: "Anyone who visits your hub can save your name, phone, and email straight to their contacts. No app needed.",
  },
  {
    icon: Share2,
    title: "Works everywhere",
    desc: "Share your hub link in your Instagram bio, texts, email signatures — anywhere you want people to find you.",
  },
];

const STEPS = [
  { icon: User, title: "Pick a username", desc: "Choose your unique tapaway.co/username" },
  { icon: Link2, title: "Add your links and info", desc: "Instagram, TikTok, payments, contact card — all in one place" },
  { icon: QrCode, title: "Share it everywhere", desc: "Text your link, post it in your bio, or simply use a tapaway card." },
];

const PersonalPricing = () => {
  const navigate = useNavigate();

  const goToSignup = () => {
    navigate("/personal/signup");
  };

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
              All Your Links,<br />One TapAway
            </h1>
            <p className="text-muted-foreground mt-1">
              One link for everything. Set up in about 3 minutes — free.
            </p>
          </div>

          <Button
            onClick={goToSignup}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Create My Hub
          </Button>

          <button
            onClick={() => document.getElementById("hub-showcase")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Scroll to see examples
            <ChevronDown className="h-3 w-3 animate-bounce" />
          </button>
        </motion.div>

        {/* 2. Hub Showcase */}
        <motion.div
          id="hub-showcase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <HubShowcase onCopyLayout={goToSignup} />
          <button
            onClick={() => document.getElementById("layout-templates")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-3 mx-auto flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Or pick a free layout below ↓
          </button>
        </motion.div>

        {/* 3. How It Works */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">How It Works</h2>
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
            onClick={goToSignup}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Create My Hub
          </Button>
        </motion.div>

        {/* Free layouts nudge */}
        <div className="text-center text-sm text-muted-foreground flex flex-col items-center gap-1">
          <span>Want something free? Pick a starter layout below</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>

        {/* 5. Layout Templates */}
        <motion.div
          id="layout-templates"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <LayoutTemplates onSelect={() => {}} />
        </motion.div>

        {/* 6. What Is a Hub? */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">What Is a Hub?</h2>
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
            onClick={goToSignup}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Create My Hub
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
