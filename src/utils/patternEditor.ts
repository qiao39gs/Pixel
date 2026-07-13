import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { EMPTY_BEAD } from './editOperations';
import { recalculateStats } from './statsUtils';

const UNDO_LIMIT = 50;

export interface Snapshot {
  pixels: TransformedPixel[];
  stats: IngredientStat[];
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
  private _undoStack: Snapshot[] = [];
  private _redoStack: Snapshot[] = [];

  constructor(pixels: TransformedPixel[] = [], stats: IngredientStat[] | null = null) {
    this._pixels = pixels;
    this._stats = stats ?? recalculateStats(pixels);
  }

  get pixels(): TransformedPixel[] { return this._pixels; }
  get stats(): IngredientStat[] { return this._stats; }
  get undoStack(): Snapshot[] { return this._undoStack; }
  get redoStack(): Snapshot[] { return this._redoStack; }

  load(pixels: TransformedPixel[], stats?: IngredientStat[]): void {
    this._pixels = pixels;
    this._stats = stats ?? recalculateStats(pixels);
    this._undoStack = [];
    this._redoStack = [];
  }

  private pushSnapshot(): void {
    const snap: Snapshot = { pixels: [...this._pixels], stats: [...this._stats] };
    this._undoStack.push(snap);
    if (this._undoStack.length > UNDO_LIMIT) this._undoStack.shift();
    this._redoStack = [];
  }

  pushUndo(): void {
    this.pushSnapshot();
  }

  brush(x: number, y: number, gridWidth: number, targetBead: BeadPaletteItem): void {
    this.pushSnapshot();
    const next = [...this._pixels];
    next[y * gridWidth + x] = { x, y, matchedBead: targetBead };
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
    this._redoStack.push({ pixels: [...this._pixels], stats: [...this._stats] });
    this._pixels = prev.pixels;
    this._stats = prev.stats;
    return prev;
  }

  redo(): Snapshot | null {
    if (this._redoStack.length === 0) return null;
    const next = this._redoStack.pop()!;
    this._undoStack.push({ pixels: [...this._pixels], stats: [...this._stats] });
    this._pixels = next.pixels;
    this._stats = next.stats;
    return next;
  }
}

export { EMPTY_BEAD };
