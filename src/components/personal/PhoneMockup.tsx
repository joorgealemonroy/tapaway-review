import { type VibeTemplate } from "@/lib/vibeTemplates";

interface PhoneMockupProps {
  vibe: VibeTemplate;
  className?: string;
}

export const PhoneMockup = ({ vibe, className = "" }: PhoneMockupProps) => {
  const { mockupTheme: t } = vibe;

  return (
    <div className={`w-[260px] select-none ${className}`}>
      {/* Phone bezel */}
      <div
        className="rounded-[2.5rem] p-3 shadow-2xl"
        style={{
          background: "linear-gradient(to bottom, #27272a, #18181b)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-10"
          style={{ backgroundColor: "#18181b" }}
        />

        {/* Screen */}
        <div
          className="rounded-[2rem] overflow-hidden"
          style={{ backgroundColor: t.bg }}
        >
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

            {/* Link pills / cards */}
            {vibe.defaultLinks.slice(0, 3).map((link, i) => {
              if (link.displayStyle === "grid" && i < 2) return null; // handled below
              return (
                <div
                  key={i}
                  className="rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2"
                  style={{
                    backgroundColor: t.cardBg,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.accent, opacity: 0.7 }}
                  />
                  <span
                    className="text-[10px] font-semibold truncate"
                    style={{ color: t.text }}
                  >
                    {link.label}
                  </span>
                </div>
              );
            })}

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
                      <div className="px-2 py-1.5">
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

            {/* Non-grid links for grid vibes */}
            {vibe.defaultLinks
              .filter((l) => l.displayStyle !== "grid")
              .slice(0, 2)
              .map((link, i) => (
                <div
                  key={`pill-${i}`}
                  className="rounded-xl px-3 py-2 mb-1.5 flex items-center gap-2"
                  style={{
                    backgroundColor: t.cardBg,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.accent, opacity: 0.7 }}
                  />
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: t.text }}
                  >
                    {link.label}
                  </span>
                </div>
              ))}

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
