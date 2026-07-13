import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { RGB, LAB, rgbToLab, deltaE76, deltaE2000, deltaE94, deltaEWeightedRGB } from '../colorUtils';
import { recalculateStats } from './statsUtils';
import { EMPTY_BEAD } from './editOperations';
import { selectPaletteByKMedoids } from './kMedoids';

export type DistanceAlgorithm = 'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB';

export interface PaletteItemWithCache extends BeadPaletteItem {
  rgb: RGB;
  lab: LAB;
}

export interface QuantizeOptions {
  gridWidth: number;
  gridHeight: number;
  colorLimit: number;
  distanceAlgorithm: DistanceAlgorithm;
  kMedoidsOptimize: boolean;
  removeBackground: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface QuantizeResult {
  pixels: TransformedPixel[];
  stats: IngredientStat[];
  gridWidth: number;
  gridHeight: number;
}

function buildDistanceFn(
  algorithm: DistanceAlgorithm,
  palette: PaletteItemWithCache[],
): (pixelLab: LAB, rgb: RGB, bead: PaletteItemWithCache) => number {
  if (algorithm === 'CIEDE2000') return (lab, _rgb, bead) => deltaE2000(lab, bead.lab);
  if (algorithm === 'CIE94') return (lab, _rgb, bead) => deltaE94(lab, bead.lab);
  if (algorithm === 'CIE76') return (lab, _rgb, bead) => deltaE76(lab, bead.lab);
  return (_lab, rgb, bead) => deltaEWeightedRGB(rgb, bead.rgb);
}

export function quantizeImage(
  imageData: ImageData,
  palette: PaletteItemWithCache[],
  options: QuantizeOptions,
): QuantizeResult {
  const { gridWidth: gw, gridHeight: gh, colorLimit, distanceAlgorithm, kMedoidsOptimize, removeBackground, brightness, contrast, saturation } = options;
  const sw = imageData.width, sh = imageData.height;
  const srcData = imageData.data;

  const dist = buildDistanceFn(distanceAlgorithm, palette);

  const bri = brightness / 100, con = contrast / 100, sat = saturation / 100;
  const adjust = (r: number, g: number, b: number): [number, number, number] => {
    let nr = r, ng = g, nb = b;
    if (bri !== 1) { nr = Math.min(255, Math.max(0, nr * bri)); ng = Math.min(255, Math.max(0, ng * bri)); nb = Math.min(255, Math.max(0, nb * bri)); }
    if (con !== 1) { nr = Math.min(255, Math.max(0, ((nr / 255 - 0.5) * con + 0.5) * 255)); ng = Math.min(255, Math.max(0, ((ng / 255 - 0.5) * con + 0.5) * 255)); nb = Math.min(255, Math.max(0, ((nb / 255 - 0.5) * con + 0.5) * 255)); }
    if (sat !== 1) { const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb; nr = Math.min(255, Math.max(0, lum + sat * (nr - lum))); ng = Math.min(255, Math.max(0, lum + sat * (ng - lum))); nb = Math.min(255, Math.max(0, lum + sat * (nb - lum))); }
    return [nr, ng, nb];
  };

  const sampleSrc = (gx: number, gy: number): [number, number, number, number] => {
    const sx = gw > 1 ? Math.round(gx * (sw - 1) / (gw - 1)) : 0;
    const sy = gh > 1 ? Math.round(gy * (sh - 1) / (gh - 1)) : 0;
    const off = (sy * sw + sx) * 4;
    return [srcData[off], srcData[off + 1], srcData[off + 2], srcData[off + 3]];
  };

  const matchBest = (pixelLab: LAB, rgb: RGB): BeadPaletteItem => {
    let best = palette[0], minDist = Infinity;
    for (const bead of palette) {
      const d = dist(pixelLab, rgb, bead);
      if (d < minDist) { minDist = d; best = bead; }
    }
    return best;
  };

  const initialMatched: TransformedPixel[] = [];
  const colorUsageCount: Record<string, number> = {};
  const nonEmptyPixelLabs: LAB[] = [];
  const nonEmptyPixelRgbs: RGB[] = [];

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const [r, g, b, a] = sampleSrc(x, y);
      if (a < 80 || (removeBackground && r > 245 && g > 245 && b > 245)) {
        initialMatched.push({ x, y, matchedBead: EMPTY_BEAD });
        continue;
      }
      const [ar, ag, ab] = adjust(r, g, b);
      const rgb: RGB = { r: ar, g: ag, b: ab };
      const pixelLab = rgbToLab(rgb);
      const best = matchBest(pixelLab, rgb);
      initialMatched.push({ x, y, matchedBead: best });
      if (best.code !== 'EMPTY') {
        colorUsageCount[best.code] = (colorUsageCount[best.code] || 0) + 1;
        nonEmptyPixelLabs.push(pixelLab);
        nonEmptyPixelRgbs.push(rgb);
      }
    }
  }

  const uniqueBeads = Object.keys(colorUsageCount);
  if (uniqueBeads.length <= colorLimit) {
    return { pixels: initialMatched, stats: recalculateStats(initialMatched), gridWidth: gw, gridHeight: gh };
  }

  const freqTopCodes = Object.entries(colorUsageCount).sort((a, b) => b[1] - a[1]).slice(0, colorLimit).map(e => e[0]);
  let topCodes: string[];
  if (kMedoidsOptimize && nonEmptyPixelLabs.length > 0) {
    const candidateItems = palette.filter(b => uniqueBeads.includes(b.code));
    topCodes = selectPaletteByKMedoids(
      nonEmptyPixelLabs.length,
      candidateItems,
      colorLimit,
      freqTopCodes,
      (i, j) => dist(nonEmptyPixelLabs[i], nonEmptyPixelRgbs[i], candidateItems[j]),
    );
  } else {
    topCodes = freqTopCodes;
  }

  const topPalette = palette.filter(b => topCodes.includes(b.code));
  const topSet = new Set(topCodes);
  const finalMatched: TransformedPixel[] = [];

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const init = initialMatched[y * gw + x];
      if (init.matchedBead.code === 'EMPTY' || topSet.has(init.matchedBead.code)) {
        finalMatched.push(init);
        continue;
      }
      const [r, g, b] = sampleSrc(x, y);
      const [ar, ag, ab] = adjust(r, g, b);
      const rgb: RGB = { r: ar, g: ag, b: ab };
      finalMatched.push({ x, y, matchedBead: matchBest(rgbToLab(rgb), rgb) });
    }
  }

  return { pixels: finalMatched, stats: recalculateStats(finalMatched), gridWidth: gw, gridHeight: gh };
}
