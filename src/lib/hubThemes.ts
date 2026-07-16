import type { CSSProperties } from 'react';

export type BackgroundThemeStyle = 'default' | 'carbon' | 'floral' | 'aurora' | string;

export interface HubTheme {
  containerStyle: CSSProperties;
  isDark: boolean;
}

/**
 * Maps a background_theme_style value to a CSS background style.
 * Shared between the rep-side LivePhonePreview and the public /:slug hub
 * so what the rep sees while editing matches what the customer sees live.
 */
export const getHubTheme = (style: BackgroundThemeStyle | null | undefined): HubTheme => {
  switch (style) {
    case 'carbon':
      return {
        isDark: true,
        containerStyle: {
          background:
            'linear-gradient(135deg, #0a0e1a 0%, #14181f 60%, #1c2028 100%)',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 6px), linear-gradient(135deg, #0a0e1a 0%, #14181f 60%, #1c2028 100%)',
        },
      };
    case 'floral':
      return {
        isDark: false,
        containerStyle: {
          background:
            'radial-gradient(circle at 15% 20%, #f9c8d9 0%, transparent 55%), radial-gradient(circle at 85% 80%, #c9b6e4 0%, transparent 55%), linear-gradient(135deg, #fff5f7 0%, #f3ecff 100%)',
        },
      };
    case 'aurora':
      return {
        isDark: true,
        containerStyle: {
          background:
            'radial-gradient(circle at 20% 30%, rgba(0, 194, 255, 0.35) 0%, transparent 55%), radial-gradient(circle at 80% 70%, rgba(180, 85, 255, 0.35) 0%, transparent 55%), linear-gradient(135deg, #0a0e1a 0%, #101426 100%)',
        },
      };
    case 'default':
    default:
      return {
        isDark: true,
        containerStyle: { background: '#0a0e1a' },
      };
  }
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isValidHex = (v: string | null | undefined): boolean =>
  typeof v === 'string' && HEX.test(v.trim());

const expand = (hex: string) => {
  const h = hex.replace('#', '');
  if (h.length === 3) return h.split('').map(c => c + c).join('');
  return h;
};

/**
 * Chooses black or white text for the given background hex, based on luminance.
 * Falls back to white when input is invalid.
 */
export const contrastOn = (hex: string | null | undefined): string => {
  if (!isValidHex(hex)) return '#ffffff';
  const h = expand(hex!.trim());
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance (Rec. 709)
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.6 ? '#0a0e1a' : '#ffffff';
};

export const safeColor = (v: string | null | undefined, fallback: string): string =>
  isValidHex(v) ? v!.trim() : fallback;

export const DEFAULT_PRIMARY = '#00C2FF';
export const DEFAULT_SECONDARY = '#0F172A';

export const THEME_OPTIONS: Array<{ value: BackgroundThemeStyle; label: string }> = [
  { value: 'default', label: 'Solid Obsidian' },
  { value: 'carbon', label: 'Dark Brushed Carbon' },
  { value: 'floral', label: 'Floral Pattern Gradient' },
  { value: 'aurora', label: 'Aurora Gradient' },
];
