import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { recalculateStats } from './statsUtils';

export const EMPTY_BEAD: BeadPaletteItem = { code: 'EMPTY', name: '透明背景', hex: 'rgba(0,0,0,0)', brand: 'MGB', series: '' };

export function floodFill(
  pixels: TransformedPixel[],
  startX: number,
  startY: number,
  gridWidth: number,
  gridHeight: number
): Set<string> {
  const startPixel = pixels[startY * gridWidth + startX];
  if (!startPixel) return new Set();
  const targetCode = startPixel.matchedBead.code;
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  visited.add(`${startX},${startY}`);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        const pixel = pixels[ny * gridWidth + nx];
        if (pixel && pixel.matchedBead.code === targetCode) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }
  return visited;
}

export function applySelectionFill(
  pixels: TransformedPixel[],
  selection: Set<string>,
  targetBead: BeadPaletteItem,
  gridWidth: number
): { pixels: TransformedPixel[]; stats: IngredientStat[] } {
  const next = [...pixels];
  selection.forEach(key => {
    const [sx, sy] = key.split(',').map(Number);
    next[sy * gridWidth + sx] = { x: sx, y: sy, matchedBead: targetBead };
  });
  return { pixels: next, stats: recalculateStats(next) };
}

export function denoisePixels(
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  palette: BeadPaletteItem[]
): { pixels: TransformedPixel[]; stats: IngredientStat[]; changed: number } {
  const next = [...pixels];
  let changed = 0;
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = y * gridWidth + x;
      const pixel = pixels[idx];
      if (pixel.matchedBead.code === 'EMPTY') continue;
      const code = pixel.matchedBead.code;
      let hasSameColorNeighbor = false;
      const neighborCounts = new Map<string, number>();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
          const nbr = pixels[ny * gridWidth + nx];
          if (nbr.matchedBead.code === 'EMPTY') continue;
          if (nbr.matchedBead.code === code) hasSameColorNeighbor = true;
          neighborCounts.set(nbr.matchedBead.code, (neighborCounts.get(nbr.matchedBead.code) || 0) + 1);
        }
      }
      if (hasSameColorNeighbor) continue;
      let bestCode = '', bestCount = 0;
      neighborCounts.forEach((count, c) => { if (count > bestCount) { bestCount = count; bestCode = c; } });
      if (bestCode && bestCount > 0) {
        const bestBead = palette.find(b => b.code === bestCode);
        if (bestBead) { next[idx] = { x, y, matchedBead: bestBead }; changed++; }
      }
    }
  }
  return { pixels: next, stats: recalculateStats(next), changed };
}
