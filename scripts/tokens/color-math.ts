/**
 * Colour maths shared by the token validator and the inventory audit. Pure functions, no deps.
 *
 * - WCAG 2.2 relative luminance and contrast ratio
 * - Colour-vision-deficiency simulation: Machado, Oliveira & Fernandes (2009), severity 1.0,
 *   applied in linear sRGB
 * - CIELAB (D65) and CIEDE2000 colour difference (Sharma, Wu & Dalal 2005)
 */

export type RGB = [number, number, number];
export type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const s = hex.replace('#', '');
  const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as RGB;
}

export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const delinearize = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linearize) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const MACHADO = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;

export type Vision = 'normal' | keyof typeof MACHADO;
export const VISIONS: Vision[] = ['normal', 'deuteranopia', 'protanopia'];

/** The colour as a person with the given vision sees it (sRGB, 0–1). */
export function simulate(hex: string, vision: Vision): RGB {
  const rgb = hexToRgb(hex);
  if (vision === 'normal') return rgb;
  const v = rgb.map(linearize);
  return MACHADO[vision].map((row) =>
    delinearize(Math.min(1, Math.max(0, row[0] * v[0]! + row[1] * v[1]! + row[2] * v[2]!))),
  ) as RGB;
}

export function rgbToLab([r, g, b]: RGB): Lab {
  const [R, G, B] = [r, g, b].map(linearize) as RGB;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const X = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const Y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const Z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

export const hexToLab = (hex: string) => rgbToLab(hexToRgb(hex));

/** CIEDE2000 ΔE between two Lab colours. */
export function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const hue = (b: number, a: number) => {
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const hp1 = hue(b1, ap1);
  const hp2 = hue(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = hp2 - hp1;
  if (Cp1 * Cp2 === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2;
  const Cpb = (Cp1 + Cp2) / 2;
  let hb = hp1 + hp2;
  if (Cp1 * Cp2 !== 0)
    hb = Math.abs(hp1 - hp2) > 180 ? (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2 : hb / 2;
  const T =
    1 -
    0.17 * Math.cos((hb - 30) * rad) +
    0.24 * Math.cos(2 * hb * rad) +
    0.32 * Math.cos((3 * hb + 6) * rad) -
    0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const SC = 1 + 0.045 * Cpb;
  const SH = 1 + 0.015 * Cpb * T;
  const RT =
    -2 *
    Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)) *
    Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

/** ΔE₀₀ between two hex colours as seen with the given vision. */
export function distance(a: string, b: string, vision: Vision = 'normal'): number {
  return deltaE2000(rgbToLab(simulate(a, vision)), rgbToLab(simulate(b, vision)));
}

/** Smallest pairwise ΔE₀₀ in a palette under the given vision, with the offending pair. */
export function closestPair(
  palette: string[],
  vision: Vision,
): { i: number; j: number; delta: number } {
  let best = { i: 0, j: 1, delta: Infinity };
  for (let i = 0; i < palette.length; i++)
    for (let j = i + 1; j < palette.length; j++) {
      const delta = distance(palette[i]!, palette[j]!, vision);
      if (delta < best.delta) best = { i, j, delta };
    }
  return best;
}
