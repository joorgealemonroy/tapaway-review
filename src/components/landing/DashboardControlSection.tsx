import { motion, useInView } from "framer-motion";
import { Check, Eye, MessageSquareReply, Sparkles } from "lucide-react";
import { useRef } from "react";

const bullets = [
  "Edit links, photos, and promos from your phone",
  "Changes go live instantly on every card",
  "No reprints, no new codes, no extra cost",
];

const tapBars = [30, 45, 38, 62, 50, 78, 100];

const FeatureTag = ({ children }: { children: string }) => (
  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-primary">
    {children}
  </span>
);

export const DashboardControlSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-background px-4 py-12 text-foreground md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
              YOU&apos;RE IN CONTROL
            </p>
            <h2 className="text-3xl font-black leading-tight text-foreground md:text-4xl lg:text-5xl">
              Your hub updates as fast as your business does.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Raised your prices? Added a new service? Running a weekend promo? Update it once in
              your dashboard and every card out in the wild updates instantly.
            </p>

            <ul className="mt-8 space-y-4">
              {bullets.map((text, index) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.35, delay: 0.15 + index * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-base font-medium text-foreground">{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[310px]"
          >
            <div className="relative rounded-[3.4rem] bg-[#1b1b1f] p-2.5 shadow-2xl">
              {/* Side buttons */}
              <div className="absolute -left-[2px] top-24 h-6 w-[3px] rounded-full bg-[#1b1b1f]" />
              <div className="absolute -left-[2px] top-36 h-10 w-[3px] rounded-full bg-[#1b1b1f]" />
              <div className="absolute -left-[2px] top-48 h-10 w-[3px] rounded-full bg-[#1b1b1f]" />
              <div className="absolute -right-[2px] top-40 h-16 w-[3px] rounded-full bg-[#1b1b1f]" />

              {/* Inner bezel */}
              <div className="rounded-[2.9rem] bg-black p-[3px]">
                {/* Screen */}
                <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.75rem] bg-background p-3 pt-9">
                  {/* Dynamic Island */}
                  <div className="absolute left-1/2 top-2 z-10 h-6 w-[100px] -translate-x-1/2 rounded-full bg-black" />
                {/* Header */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">TapAway</span>
                  <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-green-500">
                    <span className="h-1 w-1 rounded-full bg-green-500" />
                    Hub Live
                  </span>
                </div>

                {/* Hub identity row */}
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">Sample Cafe</p>
                    <p className="truncate text-[9px] text-muted-foreground">tapaway.co/samplecafe</p>
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-medium text-foreground"
                  >
                    <Eye className="h-2.5 w-2.5" />
                    View
                  </button>
                </div>

                {/* Hero stat card */}
                <div className="mb-2 rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Taps this week
                    </p>
                    <FeatureTag>Live stats</FeatureTag>
                  </div>
                  <div className="mt-1 flex items-end gap-2">
                    <p className="text-3xl font-black leading-none text-foreground">312</p>
                    <span className="mb-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-500">
                      +38%
                    </span>
                  </div>
                  <div className="mt-2 border-b border-border pb-px">
                    <div className="flex h-12 items-end gap-1">
                      {tapBars.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-primary"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sync banner */}
                <div className="mb-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold leading-tight text-foreground">
                      Edits go live on every card
                    </p>
                    <FeatureTag>Instant sync</FeatureTag>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                    Update once — every card updates instantly.
                  </p>
                </div>

                {/* Mini stat cards */}
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-card p-2">
                    <p className="text-sm font-black text-foreground">128</p>
                    <p className="text-[8px] leading-tight text-muted-foreground">Review taps</p>
                    <span className="mt-1 inline-block rounded-full bg-green-500/10 px-1.5 py-px text-[8px] font-bold text-green-500">
                      +24
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <p className="text-sm font-black text-foreground">+14</p>
                    <p className="text-[8px] leading-tight text-muted-foreground">New reviews</p>
                  </div>
                </div>

                {/* Plan row */}
                <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2">
                  <span className="text-[10px] font-bold text-foreground">TapAway Solo</span>
                  <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-green-500">
                    Hub Live
                  </span>
                </div>

                {/* Milestone card */}
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      Milestones
                    </p>
                    <FeatureTag>Smart alerts</FeatureTag>
                  </div>
                  <div className="flex items-center gap-2 border-b border-border pb-1.5">
                    <Sparkles className="h-3 w-3 shrink-0 text-yellow-500" />
                    <p className="text-[10px] font-bold text-foreground">First visit!</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1.5">
                    <MessageSquareReply className="h-3 w-3 shrink-0 text-yellow-500" />
                    <p className="text-[10px] font-bold text-foreground">First review click</p>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 z-10 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/60" />
              </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
              Your TapAway dashboard
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
