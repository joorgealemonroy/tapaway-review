import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "lucide-react";
import { type VibeTemplate } from "@/lib/vibeTemplates";

const NOTIFICATIONS = ["New Follower!", "Link Clicked!", "Sale Made!", "Profile Shared!"];

const platformColors: Record<string, string | { type: "gradient"; value: string }> = {
  instagram: { type: "gradient", value: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" },
  tiktok: "#000000",
  x: "#000000",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  discord: "#5865F2",
};

interface PhoneMockupProps {
  vibe: VibeTemplate;
  className?: string;
  isActive?: boolean;
}

export const PhoneMockup = ({ vibe, className = "", isActive = false }: PhoneMockupProps) => {
  const { mockupTheme: t } = vibe;
  const [notifIndex, setNotifIndex] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowNotif(false);
      return;
    }
    const cycle = () => {
      setShowNotif(true);
      setTimeout(() => setShowNotif(false), 2000);
      setTimeout(() => setNotifIndex((i) => (i + 1) % NOTIFICATIONS.length), 3000);
    };
    const timeout = setTimeout(cycle, 800);
    const interval = setInterval(cycle, 4000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [isActive]);

  const renderIconCircle = (link: (typeof vibe.defaultLinks)[number], size: number) => {
    if (link.iconHint === "calendar") {
      return <Calendar size={size} style={{ color: t.accent }} className="flex-shrink-0" />;
    }
    const color = platformColors[link.type];
    if (color && typeof color === "object" && color.type === "gradient") {
      return (
        <div
          className="rounded-full flex-shrink-0"
          style={{ width: size, height: size, background: color.value }}
        />
      );
    }
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: typeof color === "string" ? color : t.accent,
          opacity: typeof color === "string" ? 1 : 0.7,
        }}
      />
    );
  };

  return (
    <div className={`w-[260px] select-none ${className}`}>
      {/* Phone bezel */}
      <div
        className="rounded-[2.5rem] p-3 shadow-2xl relative"
        style={{
          background: "linear-gradient(to bottom, #27272a, #18181b)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-10"
          style={{ backgroundColor: "#18181b" }}
        />

        {/* Screen */}
        <div
          className="rounded-[2rem] overflow-hidden relative"
          style={{ backgroundColor: t.bg }}
        >
          {/* Notification bubble */}
          <AnimatePresence>
            {isActive && showNotif && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute top-7 right-3 z-20 px-2 py-1 rounded-full text-[7px] font-bold shadow-lg max-w-[90px] truncate"
                style={{
                  backgroundColor: t.accent,
                  color: t.bg,
                }}
              >
                {NOTIFICATIONS[notifIndex]}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header band */}
          <div
            className="h-20 relative"
            style={{ backgroundColor: vibe.style.headerColor }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent 40%, ${t.bg} 100%)`,
              }}
            />
          </div>

          {/* Content */}
          <div className="px-4 pb-5 -mt-6 relative z-10">
            {/* Avatar placeholder */}
            <div className="flex justify-center mb-2">
              <div
                className="w-14 h-14 rounded-full border-[3px]"
                style={{
                  backgroundColor: t.cardBg,
                  borderColor: t.bg,
                }}
              />
            </div>

            {/* Name & headline placeholders */}
            <div className="flex flex-col items-center gap-1 mb-3">
              <div
                className="h-3 w-20 rounded-full"
                style={{ backgroundColor: t.text, opacity: 0.8 }}
              />
              <div
                className="h-2 w-28 rounded-full"
                style={{ backgroundColor: t.text, opacity: 0.3 }}
              />
            </div>

            {/* Social icon row */}
            <div className="flex justify-center gap-1.5 mb-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: t.accent, opacity: 0.6 }}
                />
              ))}
            </div>

            {/* Grid cards for vibes that use them */}
            {vibe.defaultLinks.some((l) => l.displayStyle === "grid") && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {vibe.defaultLinks
                  .filter((l) => l.displayStyle === "grid")
                  .slice(0, 2)
                  .map((link, i) => (
                    <div
                      key={`grid-${i}`}
                      className="rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: t.cardBg,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <div
                        className="h-12"
                        style={{
                          backgroundColor: t.accent,
                          opacity: 0.2,
                        }}
                      />
                      <div className="px-2 py-1.5 flex items-center gap-1">
                        {renderIconCircle(link, 8)}
                        <span
                          className="text-[9px] font-semibold"
                          style={{ color: t.text }}
                        >
                          {link.label}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Non-grid links */}
            {vibe.defaultLinks
              .filter((l) => l.displayStyle !== "grid")
              .slice(0, 3)
              .map((link, i) => (
                <div
                  key={`pill-${i}`}
                  className="rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2"
                  style={{
                    backgroundColor: t.cardBg,
                    border: `1px solid ${t.border}`,
                    boxShadow: vibe.id === "neon" ? "0 0 8px rgba(0,242,255,0.5)" : undefined,
                  }}
                >
                  {renderIconCircle(link, 14)}
                  <span
                    className="text-[10px] font-semibold truncate"
                    style={{ color: t.text }}
                  >
                    {link.label}
                  </span>
                </div>
              ))}

            {/* Image block preview */}
            {vibe.defaultBlocks.some((b) => b.type === "image") && (
              <div
                className="rounded-xl overflow-hidden mb-2"
                style={{ border: `1px solid ${t.border}` }}
              >
                <div
                  className="h-16 w-full"
                  style={{ backgroundColor: t.accent, opacity: 0.15 }}
                />
              </div>
            )}

            {/* Text block preview */}
            {vibe.defaultBlocks.some((b) => b.type === "text") && (
              <div
                className="rounded-xl px-3 py-2 mt-1"
                style={{
                  backgroundColor: t.cardBg,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div
                  className="h-2 w-14 rounded-full mb-1"
                  style={{ backgroundColor: t.text, opacity: 0.5 }}
                />
                <div
                  className="h-1.5 w-full rounded-full mb-0.5"
                  style={{ backgroundColor: t.text, opacity: 0.15 }}
                />
                <div
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ backgroundColor: t.text, opacity: 0.15 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vibe label */}
      <div className="text-center mt-3">
        <p className="text-sm font-bold text-white">{vibe.name}</p>
        <p className="text-xs text-white/50">{vibe.subtitle}</p>
      </div>
    </div>
  );
};
