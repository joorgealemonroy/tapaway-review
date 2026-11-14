/** Shared by customer, rep and admin editors; every preset renders unchanged. */
export const HUB_BACKGROUND_PRESETS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Cloud', color: '#f5f5f5' },
  { name: 'Stone', color: '#e7e5e4' },
  { name: 'Linen', color: '#faf0e6' },
  { name: 'Sand', color: '#f3e5d0' },
  { name: 'Oat', color: '#ece5d8' },
  { name: 'Cream', color: '#fffaf3' },
  { name: 'Butter', color: '#fef3c7' },
  { name: 'Lemon', color: '#fef9c3' },
  { name: 'Peach', color: '#ffedd5' },
  { name: 'Apricot', color: '#ffe4cc' },
  { name: 'Coral', color: '#ffe4de' },
  { name: 'Blush', color: '#fce7f3' },
  { name: 'Rose', color: '#ffe4e6' },
  { name: 'Mauve', color: '#f3e5ef' },
  { name: 'Lavender', color: '#ede9fe' },
  { name: 'Lilac', color: '#f3e8ff' },
  { name: 'Periwinkle', color: '#e0e7ff' },
  { name: 'Sky', color: '#e0f2fe' },
  { name: 'Ice', color: '#e8f4f8' },
  { name: 'Aqua', color: '#cffafe' },
  { name: 'Mint', color: '#ecfdf5' },
  { name: 'Sage', color: '#e2ecd8' },
  { name: 'Pistachio', color: '#ecfccb' },
] as const;

/** Light, readable hub surfaces. Stored artwork and brand data remain intact. */
export function lightHubBackground(value?: string | null): string {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return '#fffaf3';
  const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  const luminance = rgb.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  return luminance >= 210 ? value : '#fffaf3';
}
