import { motion } from "framer-motion";
import { Smartphone, Palette, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubShowcase } from "./HubShowcase";
import { LayoutTemplates } from "./LayoutTemplates";

interface Props {
  onActivate: () => void;
}

const STEPS = [
  { icon: Smartphone, title: "Tap your card", desc: "One tap opens your hub" },
  { icon: Palette, title: "Build your hub", desc: "Add links, photos & more" },
  { icon: Share2, title: "Share with anyone", desc: "Instantly connect" },
];

export const CardOnboarding = ({ onActivate }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      <div className="max-w-sm mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated card */}
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
              Set up your personal hub in 30 seconds
            </p>
          </div>

          <Button
            onClick={onActivate}
            size="lg"
            className="w-full h-13 text-base font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
          >
            Activate Now
          </Button>
        </motion.div>

        {/* How It Works */}
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground text-center">How It Works</h2>
          <div className="grid grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-teal-600" />
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Real Hubs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <HubShowcase />
        </motion.div>

        {/* Layout Templates */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <LayoutTemplates onSelect={() => {}} />
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pb-8"
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
