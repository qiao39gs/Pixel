import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';

export function recalculateStats(pixels: TransformedPixel[]): IngredientStat[] {
  const statsObj = new Map<string, { bead: BeadPaletteItem; count: number }>();
  pixels.forEach(p => {
    if (p.matchedBead.code === 'EMPTY') return;
    const c = p.matchedBead.code;
    const ex = statsObj.get(c);
    if (ex) ex.count++;
    else statsObj.set(c, { bead: p.matchedBead, count: 1 });
  });
  return Array.from(statsObj.values()).sort((a, b) => b.count - a.count);
}
