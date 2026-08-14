import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { EMPTY_BEAD } from './editOperations';
import { recalculateStats } from './statsUtils';

const UNDO_LIMIT = 50;

export interface Snapshot {
  pixels: TransformedPixel[];
  stats: IngredientStat[];
  width: number;
  height: number;
}

export interface Bounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CropResult {
  pixels: TransformedPixel[];
  width: number;
  height: number;
}

export class PatternEditor {
  private _pixels: TransformedPixel[];
  private _stats: IngredientStat[];
  private _width: number;
  private _height: number;
  private _undoStack: Snapshot[] = [];
  private _redoStack: Snapshot[] = [];
  private strokeActive = false;

  constructor(pixels: TransformedPixel[] = [], stats: IngredientStat[] | null = null, width = 0, height = 0) {
    this._pixels = pixels;
    this._stats = stats ?? recalculateStats(pixels);
    this._width = width;
    this._height = height;
  }

  get pixels(): TransformedPixel[] { return this._pixels; }
  get stats(): IngredientStat[] { return this._stats; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get undoStack(): Snapshot[] { return this._undoStack; }
  get redoStack(): Snapshot[] { return this._redoStack; }

  load(pixels: TransformedPixel[], stats?: IngredientStat[], width = 0, height = 0): void {
    this._pixels = pixels;
    this._stats = stats ?? recalculateStats(pixels);
    this._width = width;
    this._height = height;
    this._undoStack = [];
    this._redoStack = [];
    this.strokeActive = false;
  }

  private pushSnapshot(): void {
    const snap: Snapshot = { pixels: [...this._pixels], stats: [...this._stats], width: this._width, height: this._height };
    this._undoStack.push(snap);
    if (this._undoStack.length > UNDO_LIMIT) this._undoStack.shift();
    this._redoStack = [];
  }

  pushUndo(): void {
    this.pushSnapshot();
  }

  beginStroke(): void {
    if (this.strokeActive) return;
    this.pushSnapshot();
    this.strokeActive = true;
  }

  endStroke(): void {
    this.strokeActive = false;
  }

  brush(x: number, y: number, gridWidth: number, targetBead: BeadPaletteItem, size = 1, shape: 'square' | 'circle' = 'square'): void {
    if (!this.strokeActive) this.pushSnapshot();
    const half = Math.max(0, Math.floor((size - 1) / 2));
    const next = [...this._pixels];
    for (let dy = -half; dy <= half; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= this._height) continue;
      for (let dx = -half; dx <= half; dx++) {
        if (shape === 'circle' && dx * dx + dy * dy > (half + 0.5) * (half + 0.5)) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= gridWidth) continue;
        next[ny * gridWidth + nx] = { x: nx, y: ny, matchedBead: targetBead };
      }
    }
    this._pixels = next;
    this._stats = recalculateStats(next);
  }

  wandFill(selection: Set<string>, targetBead: BeadPaletteItem, gridWidth: number): void {
    this.pushSnapshot();
    const next = [...this._pixels];
    selection.forEach(key => {
      const [sx, sy] = key.split(',').map(Number);
      next[sy * gridWidth + sx] = { x: sx, y: sy, matchedBead: targetBead };
    });
    this._pixels = next;
    this._stats = recalculateStats(next);
  }

  denoise(gridWidth: number, gridHeight: number, palette: BeadPaletteItem[]): number {
    const next = [...this._pixels];
    let changed = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const idx = y * gridWidth + x;
        const pixel = this._pixels[idx];
        if (pixel.matchedBead.code === 'EMPTY') continue;
        const code = pixel.matchedBead.code;
        let hasSameColorNeighbor = false;
        const neighborCounts = new Map<string, number>();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
            const nbr = this._pixels[ny * gridWidth + nx];
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
    if (changed > 0) {
      this.pushSnapshot();
      this._pixels = next;
      this._stats = recalculateStats(next);
    }
    return changed;
  }

  swapColor(sourceCode: string, targetBead: BeadPaletteItem): void {
    this.pushSnapshot();
    this._pixels = this._pixels.map(p =>
      p.matchedBead.code === sourceCode ? { ...p, matchedBead: targetBead } : p
    );
    this._stats = recalculateStats(this._pixels);
  }

  /**
   * 描边：沿所有非空内容的外侧空位向外填充 targetBead，层级数由 thickness 决定。
   * 使用八邻接判断，保证描边形成连续封闭的轮廓；只填充空格（跳过已有内容）。
   */
  strokeOutline(gridWidth: number, gridHeight: number, targetBead: BeadPaletteItem, thickness: number): void {
    const layers = Math.max(1, Math.floor(thickness));
    this.pushSnapshot();
    const next = [...this._pixels];
    for (let layer = 0; layer < layers; layer++) {
      const frontier: number[] = [];
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const idx = y * gridWidth + x;
          if (next[idx].matchedBead.code !== 'EMPTY') continue;
          let hasNeighbor = false;
          for (let dy = -1; dy <= 1 && !hasNeighbor; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
              if (next[ny * gridWidth + nx].matchedBead.code !== 'EMPTY') { hasNeighbor = true; break; }
            }
          }
          if (hasNeighbor) frontier.push(idx);
        }
      }
      if (frontier.length === 0) break;
      for (const i of frontier) {
        next[i] = { x: i % gridWidth, y: Math.floor(i / gridWidth), matchedBead: targetBead };
      }
    }
    this._pixels = next;
    this._stats = recalculateStats(next);
  }

  trim(topTrim: number, bottomTrim: number, leftTrim: number, rightTrim: number, gridWidth: number, gridHeight: number): CropResult | null {
    if (topTrim + bottomTrim + leftTrim + rightTrim === 0) return null;
    const newWidth = gridWidth - leftTrim - rightTrim;
    const newHeight = gridHeight - topTrim - bottomTrim;
    if (newWidth <= 0 || newHeight <= 0) return null;
    this.pushSnapshot();
    const result: TransformedPixel[] = [];
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const src = this._pixels[(topTrim + y) * gridWidth + (leftTrim + x)];
        result.push({ x, y, matchedBead: src.matchedBead });
      }
    }
    this._pixels = result;
    this._stats = recalculateStats(result);
    this._width = newWidth;
    this._height = newHeight;
    return { pixels: result, width: newWidth, height: newHeight };
  }

  detectBounds(gridWidth: number, gridHeight: number): Bounds | null {
    let top = gridHeight, bottom = 0, left = gridWidth, right = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const p = this._pixels[y * gridWidth + x];
        if (p && p.matchedBead.code !== 'EMPTY') {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (top > bottom || left > right) return null;
    return { top, bottom, left, right };
  }

  undo(): Snapshot | null {
    if (this._undoStack.length === 0) return null;
    const prev = this._undoStack.pop()!;
    this._redoStack.push({ pixels: [...this._pixels], stats: [...this._stats], width: this._width, height: this._height });
    this._pixels = prev.pixels;
    this._stats = prev.stats;
    this._width = prev.width;
    this._height = prev.height;
    return prev;
  }

  redo(): Snapshot | null {
    if (this._redoStack.length === 0) return null;
    const next = this._redoStack.pop()!;
    this._undoStack.push({ pixels: [...this._pixels], stats: [...this._stats], width: this._width, height: this._height });
    this._pixels = next.pixels;
    this._stats = next.stats;
    this._width = next.width;
    this._height = next.height;
    return next;
  }
}

export { EMPTY_BEAD };
