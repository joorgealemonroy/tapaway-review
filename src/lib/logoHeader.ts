/**
 * "Logo header" style — the logo is shown whole (never cropped) at the top of
 * the hub, sitting directly on the page background, and the page then flows
 * straight into the standard Solo Pro layout.
 *
 * Sizing is defined mobile-first: a width percentage of the hub column plus a
 * viewport-height cap so tall/round crest logos never push the content off
 * screen, and an absolute pixel cap so it stays sane on desktop.
 */
export type LogoScale = "sm" | "md" | "lg";

export const DEFAULT_LOGO_SCALE: LogoScale = "md";

export const LOGO_SCALE_LABELS: { value: LogoScale; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

interface LogoScaleSpec {
  /** Width as a share of the hub column. */
  width: string;
  /** Viewport-height cap (mobile-first). */
  maxHeightVh: number;
  /** Absolute pixel cap so desktop never blows the logo up. */
  maxHeightPx: number;
}

export const LOGO_SCALES: Record<LogoScale, LogoScaleSpec> = {
  sm: { width: "55%", maxHeightVh: 20, maxHeightPx: 170 },
  md: { width: "72%", maxHeightVh: 27, maxHeightPx: 230 },
  lg: { width: "88%", maxHeightVh: 34, maxHeightPx: 300 },
};

export function normalizeLogoScale(value?: string | null): LogoScale {
  return value === "sm" || value === "md" || value === "lg"
    ? value
    : DEFAULT_LOGO_SCALE;
}

/** Inline style for the logo <img> on the live hub. */
export function logoImageStyle(value?: string | null): React.CSSProperties {
  const spec = LOGO_SCALES[normalizeLogoScale(value)];
  return {
    width: spec.width,
    maxHeight: `min(${spec.maxHeightVh}vh, ${spec.maxHeightPx}px)`,
    objectFit: "contain",
  };
}

/**
 * Inline style for the logo inside a fixed-width mock (dashboard preview, rep
 * phone preview) where `vh` units would be wrong — scale off the mock width.
 */
export function logoPreviewStyle(
  value: string | null | undefined,
  mockWidth: number,
): React.CSSProperties {
  const spec = LOGO_SCALES[normalizeLogoScale(value)];
  return {
    width: spec.width,
    maxHeight: Math.round(mockWidth * (spec.maxHeightPx / 390)),
    objectFit: "contain",
  };
}

/**
 * Derive a companion page color for a logo band color: similar in family but
 * clearly distinct, so the logo band and the content section below it read as
 * two separate sections (the Reborn Wraps look) instead of one flat wall.
 */
export function deriveCompanionColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Light band -> slightly deeper page. Dark band -> slightly lifted page.
  const shift = lum > 0.5 ? -0.09 : 0.12;
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(shift > 0 ? c + (255 - c) * shift : c * (1 + shift))));
  return `#${[adjust(r), adjust(g), adjust(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}
