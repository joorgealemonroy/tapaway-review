import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  UserPlus,
  Mail,
  BarChart3,
  CreditCard,
  Phone,
  MousePointerClick,
  Eye,
  Link2,
} from "lucide-react";

const features = [
  {
    icon: UserPlus,
    title: "Save Contact — one tap",
    description:
      "Visitors tap a button and your full contact card is saved to their phone. Name, number, email, company — instantly.",
    visual: (
      <div className="bg-background rounded-2xl border border-border p-5 shadow-sm w-full max-w-[260px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">JD</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Jane Doe</p>
            <p className="text-xs text-muted-foreground">@janedoe</p>
          </div>
        </div>
        <button className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          Save Contact
        </button>
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Collect leads from your profile",
    description:
      "Turn every profile visit into a lead. Visitors enter their name, email, or phone — you get notified and can follow up.",
    visual: (
      <div className="bg-background rounded-2xl border border-border p-5 shadow-sm w-full max-w-[260px]">
        <p className="text-xs font-semibold text-foreground mb-3">Get in touch</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Your name</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Email</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Phone</span>
          </div>
        </div>
        <button className="w-full mt-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
          Submit
        </button>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Analytics that show what's working",
    description:
      "Pro users see exactly who visits their profile, which links get clicked, and where traffic comes from — all in real time.",
    visual: (
      <div className="bg-background rounded-2xl border border-border p-5 shadow-sm w-full max-w-[280px]">
        <p className="text-xs font-semibold text-foreground mb-3">Profile Analytics</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Eye className="w-3 h-3 text-primary" />
              <span className="text-lg font-bold text-foreground">247</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Views</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MousePointerClick className="w-3 h-3 text-primary" />
              <span className="text-lg font-bold text-foreground">89</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Link2 className="w-3 h-3 text-primary" />
              <span className="text-lg font-bold text-foreground">36%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">CTR</p>
          </div>
        </div>
        {/* Mini bar chart */}
        <div className="flex items-end gap-1 h-12">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary/20"
              style={{ height: `${h}%` }}
            >
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.min(h + 10, 100) * 0.6}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">Mon</span>
          <span className="text-[9px] text-muted-foreground">Sun</span>
        </div>
      </div>
    ),
  },
  {
    icon: CreditCard,
    title: "Add an NFC card — optional",
    description:
      "Want to go physical? Order a custom NFC card and share your hub with a single tap. Ships in 1–2 days, free shipping.",
    visual: (
      <div className="relative w-full max-w-[240px]">
        <div className="bg-foreground rounded-xl p-4 text-background shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">
              TapAway
            </span>
            <CreditCard className="w-4 h-4 opacity-50" />
          </div>
          <p className="text-sm font-semibold">@janedoe</p>
          <p className="text-[10px] opacity-60 mt-0.5">Tap to share</p>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
          Add-on
        </div>
      </div>
    ),
  },
];

export const PersonalFeatures = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Everything your profile can do
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            More than a link-in-bio — it's a hub that works for you.
          </p>
        </motion.div>

        <div className="space-y-12 md:space-y-16">
          {features.map((feature, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className={`flex flex-col ${
                  isReversed ? "md:flex-row-reverse" : "md:flex-row"
                } items-center gap-8 md:gap-12`}
              >
                {/* Text side */}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0">
                    {feature.description}
                  </p>
                </div>

                {/* Visual side */}
                <div className="flex-shrink-0 flex justify-center">
                  {feature.visual}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
