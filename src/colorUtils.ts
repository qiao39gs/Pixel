/**
 * Color utilities for Pixel Bead Pattern Generator
 * Supports HEX -> RGB -> CIE Lab conversion and Delta E matching (CIE76 and CIEDE2000).
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

// Rec.601 luminance — perceived brightness weight per channel
export function luminance(rgb: RGB): number {
  return rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
}

// Helper to convert hex to RGB
export function hexToRgb(hex: string): RGB {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Convert RGB to Lab space
export function rgbToLab(rgb: RGB): LAB {
  // 1. Normalize RGB to [0, 1]
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // 2. Linearize sRGB companding
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // 3. Convert to XYZ under D65 reference illuminant
  r *= 100;
  g *= 100;
  b *= 100;

  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  // 4. XYZ to Lab
  // D65 reference values
  const xn = 95.047;
  const yn = 100.000;
  const zn = 108.883;

  let xf = x / xn;
  let yf = y / yn;
  let zf = z / zn;

  xf = xf > 0.008856 ? Math.pow(xf, 1 / 3) : 7.787 * xf + 16 / 116;
  yf = yf > 0.008856 ? Math.pow(yf, 1 / 3) : 7.787 * yf + 16 / 116;
  zf = zf > 0.008856 ? Math.pow(zf, 1 / 3) : 7.787 * zf + 16 / 116;

  const l = 116 * yf - 16;
  const la = 500 * (xf - yf);
  const lb = 200 * (yf - zf);

  return { l, a: la, b: lb };
}

// CIE76 Color Distance (Euclidean distance in Lab space) - fast
export function deltaE76(lab1: LAB, lab2: LAB): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// CIEDE2000 Color Distance - Perceptually accurate formula
export function deltaE2000(lab1: LAB, lab2: LAB): number {
  const L1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;

  const L2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;

  // Helpers
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const deg = (rad: number) => (rad * 180) / Math.PI;

  const avg_L = (L1 + L2) / 2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avg_C = (C1 + C2) / 2;

  // G calculation
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avg_C, 7) / (Math.pow(avg_C, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avg_Cp = (C1p + C2p) / 2;

  // h1p and h2p
  let h1p = 0;
  if (b1 !== 0 || a1p !== 0) {
    h1p = deg(Math.atan2(b1, a1p));
    if (h1p < 0) h1p += 360;
  }

  let h2p = 0;
  if (b2 !== 0 || a2p !== 0) {
    h2p = deg(Math.atan2(b2, a2p));
    if (h2p < 0) h2p += 360;
  }

  // dhp
  let dhp = h2p - h1p;
  if (Math.abs(dhp) > 180) {
    if (h2p <= h1p) {
      dhp += 360;
    } else {
      dhp -= 360;
    }
  }

  // avg_hp
  let avg_hp = (h1p + h2p) / 2;
  if (Math.abs(h1p - h2p) > 180) {
    if (h1p + h2p < 360) {
      avg_hp += 180;
    } else {
      avg_hp -= 180;
    }
  }

  const dL_prime = L2 - L1;
  const dC_prime = C2p - C1p;
  const dH_prime = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  // Weights
  const T =
    1 -
    0.17 * Math.cos(rad(avg_hp - 30)) +
    0.24 * Math.cos(rad(2 * avg_hp)) +
    0.32 * Math.cos(rad(3 * avg_hp + 6)) -
    0.2 * Math.cos(rad(4 * avg_hp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((avg_hp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(avg_Cp, 7) / (Math.pow(avg_Cp, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  const SL = 1 + (0.015 * Math.pow(avg_L - 50, 2)) / Math.sqrt(20 + Math.pow(avg_L - 50, 2));
  const SC = 1 + 0.045 * avg_Cp;
  const SH = 1 + 0.015 * avg_Cp * T;

  // Delta E 2000
  const dE = Math.sqrt(
    Math.pow(dL_prime / SL, 2) +
      Math.pow(dC_prime / SC, 2) +
      Math.pow(dH_prime / SH, 2) +
      RT * (dC_prime / SC) * (dH_prime / SH)
  );

  return dE;
}

// CIE94 Color Distance - Graphic Arts threshold weights (Balanced alternative to 2000)
export function deltaE94(lab1: LAB, lab2: LAB): number {
  const dL = lab1.l - lab2.l;
  const C1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
  const C2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
  const dC = C1 - C2;

  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  let dH2 = da * da + db * db - dC * dC;
  if (dH2 < 0) dH2 = 0;

  const sL = 1;
  const sC = 1 + 0.045 * C1;
  const sH = 1 + 0.015 * C1;

  const vL = dL / sL;
  const vC = dC / sC;
  const vH = Math.sqrt(dH2) / sH;

  return Math.sqrt(vL * vL + vC * vC + vH * vH);
}

// Human Perceptual Weighted RGB Euclidean Distance (Dynamic Red-Mean)
// Extremely high performance with highly practical computer vision matching accuracy
export function deltaEWeightedRGB(rgb1: RGB, rgb2: RGB): number {
  const dR = rgb1.r - rgb2.r;
  const dG = rgb1.g - rgb2.g;
  const dB = rgb1.b - rgb2.b;
  const rBar = (rgb1.r + rgb2.r) / 2;
  const wR = 2 + rBar / 256;
  const wG = 4.0;
  const wB = 2 + (255 - rBar) / 256;
  return Math.sqrt(wR * dR * dR + wG * dG * dG + wB * dB * dB);
}

