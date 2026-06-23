import { useState, useEffect } from 'react';
import { TransformedPixel, IngredientStat } from '../types';
import { BeadPaletteItem } from '../types';
import { rgbToLab, deltaE76, deltaE2000, deltaE94, deltaEWeightedRGB } from '../colorUtils';
import { recalculateStats } from '../utils/statsUtils';

type PaletteItemWithCache = BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: { l: number; a: number; b: number } };

interface Params {
  croppedImageDataUrl: string;
  panelPreset: '52x52' | '78x78' | '104x104' | 'custom';
  customWidth: number;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  removeBackground: boolean;
  colorLimit: number;
  distanceAlgorithm: 'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB';
  currentPalette: PaletteItemWithCache[];
  gridWidth: number;
  gridHeight: number;
}

export function useImageProcessing({ croppedImageDataUrl, panelPreset, customWidth, aspectRatio, removeBackground, colorLimit, distanceAlgorithm, currentPalette, gridWidth, gridHeight }: Params) {
  const [transformedPixels, setTransformedPixels] = useState<TransformedPixel[]>([]);
  const [stats, setStats] = useState<IngredientStat[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  useEffect(() => {
    if (!croppedImageDataUrl) {
      setTransformedPixels([]);
      setStats([]);
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    let active = true;
    const img = new Image();
    img.src = croppedImageDataUrl;
    img.onload = () => {
      if (!active) return;
      const imgRatio = img.width / img.height;
      const sw = img.width, sh = img.height;
      setImageAspectRatio(imgRatio);

      let gw: number;
      if (panelPreset === '52x52') gw = 52;
      else if (panelPreset === '78x78') gw = 78;
      else if (panelPreset === '104x104') gw = 104;
      else gw = Math.min(150, Math.max(5, customWidth));
      const ratio = (() => {
        if (aspectRatio === 'auto') return 1 / imgRatio;
        const m: Record<string, number> = { '1:1': 1, '4:3': 3/4, '3:4': 4/3, '16:9': 9/16, '9:16': 16/9 };
        return m[aspectRatio] ?? 1;
      })();
      const gh = Math.max(1, Math.round(gw * ratio));

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = sw; srcCanvas.height = sh;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) { setIsProcessing(false); return; }
      srcCtx.drawImage(img, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

      const matchBest = (r: number, g: number, b: number, palette: PaletteItemWithCache[]): BeadPaletteItem => {
        const pixelLab = rgbToLab({ r, g, b });
        let best = palette[0], minDist = Infinity;
        for (const bead of palette) {
          let dist = 0;
          if (distanceAlgorithm === 'CIEDE2000') dist = deltaE2000(pixelLab, bead.lab);
          else if (distanceAlgorithm === 'CIE94') dist = deltaE94(pixelLab, bead.lab);
          else if (distanceAlgorithm === 'CIE76') dist = deltaE76(pixelLab, bead.lab);
          else dist = deltaEWeightedRGB({ r, g, b }, bead.rgb);
          if (dist < minDist) { minDist = dist; best = bead; }
        }
        return best;
      };

      const EMPTY: BeadPaletteItem = { code: 'EMPTY', name: '透明背景', hex: 'rgba(0,0,0,0)', brand: 'MGB', series: '' };
      const initialMatched: TransformedPixel[] = [];
      const colorUsageCount: Record<string, number> = {};

      for (let y = 0; y < gh; y++) {
        const sy = gh > 1 ? Math.round(y * (sh - 1) / (gh - 1)) : 0;
        for (let x = 0; x < gw; x++) {
          const sx = gw > 1 ? Math.round(x * (sw - 1) / (gw - 1)) : 0;
          const off = (sy * sw + sx) * 4;
          const r = srcData[off], g = srcData[off+1], b = srcData[off+2], a = srcData[off+3];
          if (a < 80 || (removeBackground && r > 245 && g > 245 && b > 245)) {
            initialMatched.push({ x, y, matchedBead: EMPTY });
            continue;
          }
          const best = matchBest(r, g, b, currentPalette);
          initialMatched.push({ x, y, matchedBead: best });
          if (best.code !== 'EMPTY') colorUsageCount[best.code] = (colorUsageCount[best.code] || 0) + 1;
        }
      }

      const uniqueBeads = Object.keys(colorUsageCount);
      if (uniqueBeads.length <= colorLimit) {
        if (active) { setTransformedPixels(initialMatched); setStats(recalculateStats(initialMatched)); setIsProcessing(false); }
        return;
      }

      const topCodes = Object.entries(colorUsageCount).sort((a, b) => b[1] - a[1]).slice(0, colorLimit).map(e => e[0]);
      const topPalette = currentPalette.filter(b => topCodes.includes(b.code));
      const finalMatched: TransformedPixel[] = [];

      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const init = initialMatched[y * gw + x];
          if (init.matchedBead.code === 'EMPTY') { finalMatched.push(init); continue; }
          if (topCodes.includes(init.matchedBead.code)) { finalMatched.push(init); continue; }
          const sy2 = gh > 1 ? Math.round(y * (sh - 1) / (gh - 1)) : 0;
          const sx2 = gw > 1 ? Math.round(x * (sw - 1) / (gw - 1)) : 0;
          const off2 = (sy2 * sw + sx2) * 4;
          const r = srcData[off2], g2 = srcData[off2+1], b2 = srcData[off2+2];
          finalMatched.push({ x, y, matchedBead: matchBest(r, g2, b2, topPalette) });
        }
      }

      if (active) { setTransformedPixels(finalMatched); setStats(recalculateStats(finalMatched)); setIsProcessing(false); }
    };
    img.onerror = () => { if (active) setIsProcessing(false); };
    return () => { active = false; };
  }, [croppedImageDataUrl, gridWidth, gridHeight, colorLimit, currentPalette, distanceAlgorithm, removeBackground]);

  return { transformedPixels, stats, isProcessing, imageAspectRatio, setTransformedPixels, setStats };
}
