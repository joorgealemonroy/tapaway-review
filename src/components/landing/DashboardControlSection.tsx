import { motion, useInView } from "framer-motion";
import { Check, ExternalLink, Eye, MessageSquareReply, Sparkles, Trophy } from "lucide-react";
import { useRef } from "react";

const bullets = [
  "Edit links, photos, and promos from your phone",
  "Changes go live instantly on every card",
  "No reprints, no new codes, no extra cost",
];

const pointers = [
  { label: "Plan status" },
  { label: "Live link" },
  { label: "Tap alerts" },
  { label: "Review activity" },
];

const DashboardCard = ({
  icon: Icon,
  title,
  body,
  meta,
  tone = "default",
  number,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  meta?: string;
  tone?: "default" | "accent" | "highlight";
  number: number;
}) => {
  const iconBg =
    tone === "accent"
      ? "bg-primary/20 text-primary"
      : tone === "highlight"
        ? "bg-yellow-500/10 text-yellow-500"
        : "bg-muted text-muted-foreground";

  return (
    <div className="relative rounded-xl border border-border bg-card p-3 shadow-sm">
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-sm">
        {number}
      </span>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-sm font-bold text-foreground">{title}</h4>
            {meta && (
              <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                {meta}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
};

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
            className="relative mx-auto w-full max-w-sm lg:max-w-md"
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
                <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.75rem] bg-background p-4 pt-12">
                  {/* Dynamic Island */}
                  <div className="absolute left-1/2 top-2.5 z-10 h-8 w-[120px] -translate-x-1/2 rounded-full bg-black" />
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">TapAway</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Hub identity row */}
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">Sample Cafe</p>
                    <p className="text-xs text-muted-foreground">tapaway.co/samplecafe</p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                </div>

                {/* Dashboard cards */}
                <div className="space-y-3">
                  <DashboardCard
                    icon={Trophy}
                    title="TapAway Solo plan"
                    body="Your hub is live and taking taps."
                    meta="Hub Live"
                    tone="accent"
                    number={1}
                  />
                  <DashboardCard
                    icon={Sparkles}
                    title="Your hub is live"
                    body="tapaway.co/samplecafe"
                    tone="default"
                    number={2}
                  />
                  <DashboardCard
                    icon={Sparkles}
                    title="First visit!"
                    body="Someone tapped through — it’s working. Keep your cards where people can see them."
                    tone="highlight"
                    number={3}
                  />
                  <DashboardCard
                    icon={MessageSquareReply}
                    title="First review click"
                    body="Someone tapped through to leave you a review. That’s the whole point — keep it coming."
                    tone="highlight"
                    number={4}
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
              Your TapAway dashboard
            </p>

            {/* Pointer legend */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs text-muted-foreground">
              {pointers.map((p, i) => (
                <span key={p.label} className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground">
                    {i + 1}
                  </span>
                  {p.label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
