import { BeadPaletteItem, TransformedPixel } from '../types';

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
  let head = 0;
  visited.add(`${startX},${startY}`);
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
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
  return visited;
}
