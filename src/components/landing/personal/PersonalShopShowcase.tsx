import { motion } from "framer-motion";
import { DollarSign, Play, Instagram, Twitter, Youtube, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProfileCard = () => (
  <motion.div
    className="w-72 rounded-3xl p-6 space-y-4"
    style={{ background: "hsl(220, 30%, 14%)", border: "1px solid hsl(220, 20%, 22%)" }}
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.15 }}
  >
    <div className="flex flex-col items-center gap-2">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl">
        JD
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Jane Doe</p>
        <p className="text-white/50 text-xs">Creator · Designer · Coach</p>
      </div>
    </div>
    <div className="space-y-2">
      {["My Portfolio", "Book a Call", "Free Guide"].map((label) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-white"
          style={{ background: "hsl(220, 25%, 20%)" }}
        >
          <span>{label}</span>
          <ExternalLink className="h-3.5 w-3.5 text-white/40" />
        </div>
      ))}
    </div>
    <div className="flex justify-center gap-4 pt-1">
      {[Instagram, Twitter, Youtube, Music].map((Icon, i) => (
        <div key={i} className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "hsl(220, 25%, 20%)" }}>
          <Icon className="h-3.5 w-3.5 text-white/60" />
        </div>
      ))}
    </div>
  </motion.div>
);

const RevenueCard = () => (
  <motion.div
    className="w-44 rounded-2xl p-4 shadow-2xl"
    style={{ background: "hsl(var(--primary))" }}
    initial={{ opacity: 0, x: 30, y: -10 }}
    whileInView={{ opacity: 1, x: 0, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.35 }}
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
        <DollarSign className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="text-primary-foreground/80 text-xs font-medium">Total Revenue</span>
    </div>
    <p className="text-primary-foreground text-2xl font-extrabold">$4,280</p>
    <p className="text-primary-foreground/60 text-[10px] mt-0.5">+$720 this month</p>
  </motion.div>
);

const ProductCard = () => (
  <motion.div
    className="w-48 rounded-2xl overflow-hidden shadow-2xl bg-white"
    initial={{ opacity: 0, x: -30, y: 10 }}
    whileInView={{ opacity: 1, x: 0, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.45 }}
  >
    <div className="h-28 bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center">
      <Play className="h-10 w-10 text-foreground/30" />
    </div>
    <div className="p-3 space-y-1.5">
      <p className="text-foreground text-sm font-semibold leading-tight">Content Creator Masterclass</p>
      <p className="text-muted-foreground text-xs">12 video lessons</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-foreground font-bold text-sm">$49</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
          Buy now
        </span>
      </div>
    </div>
  </motion.div>
);

const PersonalShopShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-12 md:py-20 px-4 overflow-hidden" style={{ background: "hsl(213, 35%, 8%)" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />

      <div className="relative max-w-6xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-10 md:mb-16 space-y-4">
          <motion.h2
            className="text-2xl md:text-5xl font-extrabold tracking-tight text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Sell directly from your hub
          </motion.h2>
          <motion.p
            className="text-white/60 text-base md:text-lg max-w-md mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Digital products, courses, PDFs — list them on your hub and get paid instantly.
          </motion.p>
        </div>

        {/* Mobile layout: stacked */}
        <div className="flex flex-col items-center gap-6 md:hidden">
          <ProfileCard />
          <RevenueCard />
          <ProductCard />
        </div>

        {/* Desktop layout: composed with floating cards */}
        <div className="hidden md:block relative max-w-lg mx-auto" style={{ minHeight: 520 }}>
          <div className="relative z-10 flex justify-center">
            <ProfileCard />
          </div>
          <div className="absolute z-20 right-0 md:-right-8 top-4" style={{ rotate: "4deg" }}>
            <RevenueCard />
          </div>
          <div className="absolute z-20 left-0 md:-left-8 bottom-8" style={{ rotate: "-3deg" }}>
            <ProductCard />
          </div>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10 md:mt-12"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55 }}
        >
          <Button
            onClick={() => navigate("/personal/signup")}
            size="lg"
            className="h-14 px-10 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Start Selling
          </Button>
          <p className="text-white/40 text-xs mt-3">Free to start · No credit card required</p>
        </motion.div>
      </div>
    </section>
  );
};

export default PersonalShopShowcase;
