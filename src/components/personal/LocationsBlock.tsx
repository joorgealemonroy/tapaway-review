import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { getOptimizedImageUrl } from "@/components/personal/OptimizedImage";
import {
  parseLocationsContent,
  resolveLocationDestination,
  type LocationEntry,
} from "@/lib/locationsBlock";

interface Props {
  content: unknown;
  isDarkBg?: boolean;
  textColor?: string | null;
  /** Preview mode renders the same cards but without navigating away */
  isPreview?: boolean;
  onSelect?: (destination: string) => void;
}

const LocationCardInner = ({
  location,
  ctaLabel,
  isDarkBg,
  textColor,
}: {
  location: LocationEntry;
  ctaLabel: string;
  isDarkBg: boolean;
  textColor?: string | null;
}) => {
  const titleStyle = textColor ? { color: textColor } : undefined;
  const mutedStyle = textColor ? { color: textColor, opacity: 0.7 } : undefined;

  return (
    <div
      className={`group h-full overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 active:scale-[0.98] hover:shadow-lg ${
        isDarkBg
          ? "border-white/15 bg-white/[0.07] hover:border-white/30"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden ${
          isDarkBg ? "bg-white/5" : "bg-muted"
        }`}
      >
        {location.imageUrl ? (
          <img
            src={getOptimizedImageUrl(location.imageUrl, 800)}
            alt={location.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin
              className={`h-8 w-8 ${isDarkBg ? "text-white/40" : "text-muted-foreground"}`}
            />
          </div>
        )}
      </div>

      <div className="space-y-1 p-4">
        <h3
          className={`text-[17px] font-bold leading-tight ${
            textColor ? "" : isDarkBg ? "text-white" : "text-foreground"
          }`}
          style={titleStyle}
        >
          {location.name}
        </h3>
        {location.city && (
          <p
            className={`flex items-center gap-1 text-sm ${
              textColor ? "" : isDarkBg ? "text-white/70" : "text-muted-foreground"
            }`}
            style={mutedStyle}
          >
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{location.city}</span>
          </p>
        )}
        {location.subtitle && (
          <p
            className={`text-xs leading-snug ${
              textColor ? "" : isDarkBg ? "text-white/60" : "text-muted-foreground"
            }`}
            style={mutedStyle}
          >
            {location.subtitle}
          </p>
        )}

        <div
          className={`mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
            isDarkBg
              ? "bg-white text-black"
              : "bg-foreground text-background"
          }`}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export const LocationsBlock = memo(
  ({ content, isDarkBg = false, textColor, isPreview = false, onSelect }: Props) => {
    const parsed = parseLocationsContent(content);
    const locations = parsed.locations.filter((l) => l.name || l.imageUrl);

    if (locations.length === 0) return null;

    const headingStyle = textColor ? { color: textColor } : undefined;
    const subtitleStyle = textColor ? { color: textColor, opacity: 0.6 } : undefined;

    return (
      <section className="w-full space-y-4">
        {(parsed.title || parsed.subtitle) && (
          <div className="space-y-1 text-center">
            {parsed.title && (
              <h2
                className={`text-2xl font-extrabold tracking-tight ${
                  textColor ? "" : isDarkBg ? "text-white" : "text-foreground"
                }`}
                style={headingStyle}
              >
                {parsed.title}
              </h2>
            )}
            {parsed.subtitle && (
              <p
                className={`mx-auto max-w-[34ch] text-[13px] leading-relaxed ${
                  textColor ? "" : isDarkBg ? "text-white/60" : "text-muted-foreground"
                }`}
                style={subtitleStyle}
              >
                {parsed.subtitle}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {locations.map((location, index) => {
            const destination = resolveLocationDestination(location.destination);
            const card = (
              <LocationCardInner
                location={location}
                ctaLabel={parsed.ctaLabel}
                isDarkBg={isDarkBg}
                textColor={textColor}
              />
            );
            const key = `${location.destination || location.name}-${index}`;

            if (isPreview || destination.kind === "none") {
              return (
                <button
                  key={key}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => onSelect?.(location.destination)}
                >
                  {card}
                </button>
              );
            }

            if (destination.kind === "external") {
              return (
                <a
                  key={key}
                  href={destination.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={() => onSelect?.(location.destination)}
                >
                  {card}
                </a>
              );
            }

            return (
              <Link
                key={key}
                to={destination.path}
                className="block"
                onClick={() => onSelect?.(location.destination)}
              >
                {card}
              </Link>
            );
          })}
        </div>
      </section>
    );
  }
);

LocationsBlock.displayName = "LocationsBlock";

export default LocationsBlock;
