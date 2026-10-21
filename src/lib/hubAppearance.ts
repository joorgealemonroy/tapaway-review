/** Light, readable hub surfaces. Stored artwork and brand data remain intact. */
export function lightHubBackground(value?: string | null): string {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return '#fffaf3';
  const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  const luminance = rgb.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  return luminance >= 210 ? value : '#fffaf3';
}
