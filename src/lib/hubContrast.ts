/**
 * Shared readability rules for public hubs.
 *
 * A hub's page background can be set to anything (a sampled logo color, a
 * gradient, white, black). Every surface that draws the hub — the live page,
 * the dashboard preview and the rep phone preview — derives its text and
 * button colors from this single helper so they can never drift apart.
 */

/** Pull the last solid color out of a gradient string. */
export function baseColorFromGradient(gradient: string): string {
  const match = gradient.match(
    /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g,
  );
  return match && match.length > 0 ? match[match.length - 1] : "#000000";
}

/** Perceived luminance 0 (black) → 1 (white). Returns null when unparseable. */
export function colorLuminance(color: string | null | undefined): number | null {
  if (!color) return null;
  const value = color.trim();

  const rgb = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  let hex = value.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isDarkColor(color: string | null | undefined): boolean {
  const lum = colorLuminance(
    color && (color.includes("gradient") ? baseColorFromGradient(color) : color),
  );
  return lum === null ? false : lum < 0.5;
}

export interface HubContrast {
  /** True when the page background reads as dark. */
  isDark: boolean;
  /** Solid color the background resolves to (gradients collapsed). */
  baseColor: string;
  /** Tailwind classes for the floating Save contact / Share chips. */
  chipClass: string;
  /** Tailwind class for the icon inside those chips. */
  chipIconClass: string;
  /** Explicit text colors, safe against system light/dark mode. */
  textColor: string;
  mutedTextColor: string;
}

export function resolveHubContrast(
  background: string | null | undefined,
): HubContrast {
  const raw = background || "#000000";
  const baseColor = raw.includes("gradient") ? baseColorFromGradient(raw) : raw;
  const isDark = isDarkColor(baseColor);

  return {
    isDark,
    baseColor,
    chipClass: isDark
      ? "bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-sm"
      : "bg-black/[0.06] hover:bg-black/[0.12] border border-black/10 backdrop-blur-sm",
    chipIconClass: isDark ? "text-white" : "text-gray-900",
    textColor: isDark ? "#FFFFFF" : "#111827",
    mutedTextColor: isDark ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.65)",
  };
}

/**
 * Nudge an owner-picked color so it stays visible on the given background.
 * Returns the original color when it already has enough separation.
 */
export function ensureReadable(
  color: string | null | undefined,
  background: string | null | undefined,
): string | null {
  if (!color) return color ?? null;
  const colorLum = colorLuminance(color);
  const bgLum = colorLuminance(
    background && background.includes("gradient")
      ? baseColorFromGradient(background)
      : background,
  );
  if (colorLum === null || bgLum === null) return color;
  if (Math.abs(colorLum - bgLum) >= 0.25) return color;
  return bgLum < 0.5 ? "#FFFFFF" : "#111827";
}
