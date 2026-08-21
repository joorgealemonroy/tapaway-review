/**
 * Banner shape presets shared by the public hub, the dashboard preview and the
 * rep phone preview so a manually-cropped banner renders identically everywhere.
 */
export type BannerAspect = "short" | "standard" | "tall";

export const BANNER_ASPECTS: Record<BannerAspect, number> = {
  short: 16 / 5,      // 3.20 — wide strip, good for wordmark logos
  standard: 16 / 9,   // 1.78 — default
  tall: 4 / 3,        // 1.33 — big, photo-style header
};

export const BANNER_ASPECT_LABELS: { value: BannerAspect; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "standard", label: "Standard" },
  { value: "tall", label: "Tall" },
];

export const DEFAULT_BANNER_ASPECT: BannerAspect = "standard";

export function normalizeBannerAspect(value?: string | null): BannerAspect {
  return value === "short" || value === "standard" || value === "tall"
    ? value
    : DEFAULT_BANNER_ASPECT;
}

/** Numeric width/height ratio for a stored banner_aspect value. */
export function bannerAspectRatio(value?: string | null): number {
  return BANNER_ASPECTS[normalizeBannerAspect(value)];
}

/** CSS aspect-ratio string, e.g. "3.2 / 1". */
export function bannerAspectCss(value?: string | null): string {
  return `${bannerAspectRatio(value)} / 1`;
}
