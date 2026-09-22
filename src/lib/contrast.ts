function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function luminance(hex: string): number {
  const f = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = channels(hex).map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-Kontrastverhältnis, 1 bis 21. */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const a = luminance(fgHex);
  const b = luminance(bgHex);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Farbe mit Deckkraft über einen Grund gelegt, als Hex. */
export function mixOver(fgHex: string, bgHex: string, alpha: number): string {
  const fg = channels(fgHex);
  const bg = channels(bgHex);
  const out = fg.map((v, i) => Math.round((v * alpha + bg[i] * (1 - alpha)) * 255));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}
