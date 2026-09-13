/**
 * "Logo header" style — the logo is shown whole (never cropped) at the top of
 * the hub, sitting directly on the page background, and the page then flows
 * straight into the standard TapAway Solo layout.
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
