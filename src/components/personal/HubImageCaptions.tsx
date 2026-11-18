interface BannerCaptionProps {
  heading?: string | null;
  headline?: string | null;
  bio?: string | null;
  compact?: boolean;
}

/** A small, readable surface behind banner text, without dimming the artwork. */
export function HubBannerCaption({ heading, headline, bio, compact = false }: BannerCaptionProps) {
  if (!heading && !headline && !bio) return null;
  return (
    <div
      data-hub-banner-caption=""
      className={`inline-block max-w-full rounded-2xl text-white shadow-sm backdrop-blur-sm ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.70))" }}
    >
      {heading && <h1 className={`font-bold leading-tight break-words [overflow-wrap:anywhere] ${compact ? "text-xl" : "text-3xl"}`}>{heading}</h1>}
      {headline && <p className={`mt-1.5 leading-snug whitespace-normal break-words ${compact ? "text-sm" : "text-base"}`}>{headline}</p>}
      {bio && <p className={`mt-2 max-w-xs mx-auto whitespace-pre-wrap break-words leading-relaxed ${compact ? "text-sm" : "text-base"}`}>{bio}</p>}
    </div>
  );
}

/** The fade follows the caption height, including labels that wrap on phones. */
export function HubImageCaption({ label, compact = false, large = false }: { label: string; compact?: boolean; large?: boolean }) {
  return (
    <div
      data-hub-image-caption=""
      className={`absolute inset-x-0 bottom-0 pt-8 text-left ${compact ? "px-2.5 pb-2.5" : "px-3 pb-3"}`}
      style={{ background: "linear-gradient(to bottom, transparent 0, rgba(0,0,0,0.68) 1.75rem, rgba(0,0,0,0.88) 100%)" }}
    >
      <span className={`block font-bold leading-snug text-white uppercase tracking-wide whitespace-normal break-words [overflow-wrap:anywhere] ${large ? compact ? "text-base" : "text-lg" : compact ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
    </div>
  );
}
