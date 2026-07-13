import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { TransformedPixel } from '../types';
import { BeadPaletteItem } from '../types';
import { EMPTY_BEAD, floodFill as doFloodFill } from './editOperations';

export interface GridCell { x: number; y: number; }

export interface PointerCtx {
  editMode: boolean;
  dragMode: boolean;
  brushBead: BeadPaletteItem | null;
  isEraser: boolean;
  wandMode: boolean;
  transformedPixels: TransformedPixel[];
  gridWidth: number;
  gridHeight: number;
  scale: number;
  panOffset: { x: number; y: number };
  isPanning: boolean;
  panStart: { x: number; y: number };

  coordToGrid: (clientX: number, clientY: number) => GridCell | null;

  setBrushBead: (b: BeadPaletteItem | null) => void;
  setIsEraser: (v: boolean) => void;
  setSelectedCell: (c: GridCell | null) => void;
  setWandSelection: (s: Set<string>) => void;
  setIsPanning: (v: boolean) => void;
  setPanStart: (p: { x: number; y: number }) => void;
  setPanOffset: (p: { x: number; y: number }) => void;
  setScale: (s: number) => void;
  applyBrush: (x: number, y: number, gridWidth: number) => void;
  applyWandFill: (cell: GridCell, selection: Set<string>, targetBead: BeadPaletteItem, gridWidth: number) => void;
  pushUndo: () => void;
}

type State = 'idle' | 'panning' | 'brushing' | 'pinch' | 'longPress';

export class PointerInteraction {
  private state: State = 'idle';
  private editDrag = false;
  private editFilled = new Set<string>();
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressPicked = false;
  private touchStart: { x: number; y: number } | null = null;
  private pinch: { dist: number; scale: number } | null = null;

  constructor(private ctx: PointerCtx) {}

  updateCtx(ctx: Partial<PointerCtx>) {
    this.ctx = { ...this.ctx, ...ctx };
  }

  private clearTimeout() {
    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
  }

  onMouseDown(e: ReactMouseEvent) {
    const c = this.ctx;
    if (c.editMode) {
      if (e.button === 2) {
        e.preventDefault();
        const cell = c.coordToGrid(e.clientX, e.clientY);
        if (cell) {
          const p = c.transformedPixels[cell.y * c.gridWidth + cell.x];
          if (p && p.matchedBead.code !== 'EMPTY') { c.setBrushBead(p.matchedBead); c.setSelectedCell(cell); }
        }
        return;
      }
      if (e.button === 0) {
        if (c.wandMode) {
          const cell = c.coordToGrid(e.clientX, e.clientY);
          if (cell) {
            if (c.brushBead || c.isEraser) {
              const sel = doFloodFill(c.transformedPixels, cell.x, cell.y, c.gridWidth, c.gridHeight);
              c.pushUndo();
              c.applyWandFill(cell, sel, c.isEraser ? EMPTY_BEAD : c.brushBead!, c.gridWidth);
            } else {
              c.setWandSelection(doFloodFill(c.transformedPixels, cell.x, cell.y, c.gridWidth, c.gridHeight));
              c.setSelectedCell(cell);
            }
          }
          return;
        }
        if (c.brushBead || c.isEraser) {
          this.editDrag = true;
          this.editFilled.clear();
          const cell = c.coordToGrid(e.clientX, e.clientY);
          if (cell) c.applyBrush(cell.x, cell.y, c.gridWidth);
        } else {
          c.setSelectedCell(c.coordToGrid(e.clientX, e.clientY));
        }
        return;
      }
    }
    if (e.button !== 0) return;
    this.state = 'panning';
    c.setIsPanning(true);
    c.setPanStart({ x: e.clientX - c.panOffset.x, y: e.clientY - c.panOffset.y });
  }

  onMouseMove(e: ReactMouseEvent) {
    const c = this.ctx;
    if (this.editDrag && (c.brushBead || c.isEraser)) {
      const cell = c.coordToGrid(e.clientX, e.clientY);
      if (!cell) return;
      const key = `${cell.x},${cell.y}`;
      if (this.editFilled.has(key)) return;
      this.editFilled.add(key);
      c.applyBrush(cell.x, cell.y, c.gridWidth);
      return;
    }
    if (c.isPanning) {
      c.setPanOffset({ x: e.clientX - c.panStart.x, y: e.clientY - c.panStart.y });
    }
  }

  onMouseUp() {
    if (this.editDrag) { this.editDrag = false; this.editFilled.clear(); return; }
    if (this.state === 'panning') { this.ctx.setIsPanning(false); }
    this.state = 'idle';
  }

  onTouchStart(e: ReactTouchEvent) {
    const c = this.ctx;
    if (e.touches.length >= 2) {
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      this.pinch = { dist: d, scale: c.scale };
      this.state = 'pinch';
      this.clearTimeout();
      return;
    }
    this.clearTimeout();
    const t = e.touches[0];
    const cx = t.clientX, cy = t.clientY;
    if (!c.editMode || c.dragMode) {
      this.state = 'panning';
      c.setPanStart({ x: cx - c.panOffset.x, y: cy - c.panOffset.y });
      c.setIsPanning(true);
      return;
    }
    this.longPressPicked = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      const cell = c.coordToGrid(cx, cy);
      if (cell) {
        const pixel = c.transformedPixels[cell.y * c.gridWidth + cell.x];
        if (pixel && pixel.matchedBead.code !== 'EMPTY') {
          c.setBrushBead(pixel.matchedBead);
          c.setIsEraser(false);
          this.longPressPicked = true;
          this.editDrag = false;
        }
      }
    }, 500);
    if (c.wandMode) {
      const cell = c.coordToGrid(cx, cy);
      if (cell) {
        if (c.brushBead || c.isEraser) {
          this.touchStart = { x: cx, y: cy };
        } else {
          c.setWandSelection(doFloodFill(c.transformedPixels, cell.x, cell.y, c.gridWidth, c.gridHeight));
        }
        c.setSelectedCell(cell);
      }
      return;
    }
    if (c.brushBead || c.isEraser) {
      this.editFilled.clear();
      this.touchStart = { x: cx, y: cy };
    } else {
      c.setSelectedCell(c.coordToGrid(cx, cy));
    }
  }

  onTouchMove(e: ReactTouchEvent) {
    const c = this.ctx;
    if (e.touches.length >= 2 && this.pinch) {
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      const ns = Math.max(4, Math.min(32, Math.round(this.pinch.scale * d / this.pinch.dist)));
      c.setScale(ns);
      return;
    }
    this.clearTimeout();
    const t = e.touches[0];
    if (!c.editMode || c.dragMode) {
      if (!c.isPanning) return;
      c.setPanOffset({ x: t.clientX - c.panStart.x, y: t.clientY - c.panStart.y });
      return;
    }
    if (c.wandMode || (!c.brushBead && !c.isEraser) || this.longPressPicked) return;
    if (!this.editDrag) {
      this.editDrag = true;
      if (this.touchStart) {
        const sc = c.coordToGrid(this.touchStart.x, this.touchStart.y);
        if (sc) {
          const k = `${sc.x},${sc.y}`;
          if (!this.editFilled.has(k)) { this.editFilled.add(k); c.applyBrush(sc.x, sc.y, c.gridWidth); }
        }
      }
    }
    const cell = c.coordToGrid(t.clientX, t.clientY);
    if (!cell) return;
    const key = `${cell.x},${cell.y}`;
    if (this.editFilled.has(key)) return;
    this.editFilled.add(key);
    c.applyBrush(cell.x, cell.y, c.gridWidth);
  }

  onTouchEnd() {
    const c = this.ctx;
    this.pinch = null;
    this.clearTimeout();
    if (c.editMode && !c.dragMode) {
      if ((c.brushBead || c.isEraser) && !this.longPressPicked && !this.editDrag && this.touchStart) {
        const cell = c.coordToGrid(this.touchStart.x, this.touchStart.y);
        if (cell) {
          if (c.wandMode) {
            const sel = doFloodFill(c.transformedPixels, cell.x, cell.y, c.gridWidth, c.gridHeight);
            c.pushUndo();
            c.applyWandFill(cell, sel, c.isEraser ? EMPTY_BEAD : c.brushBead!, c.gridWidth);
          } else {
            c.applyBrush(cell.x, cell.y, c.gridWidth);
          }
        }
      }
      this.editDrag = false;
      this.editFilled.clear();
      this.touchStart = null;
      this.longPressPicked = false;
    } else {
      c.setIsPanning(false);
    }
    this.state = 'idle';
  }

  onWheel(e: WheelEvent, rect: DOMRect) {
    const c = this.ctx;
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const oldScale = c.scale;
    const po = c.panOffset;
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.max(4, Math.min(32, Math.round(oldScale * (1 + delta))));
    if (newScale === oldScale) return;
    const ratio = newScale / oldScale;
    c.setScale(newScale);
    c.setPanOffset({ x: cx - (cx - po.x) * ratio, y: cy - (cy - po.y) * ratio });
  }

  destroy() {
    this.clearTimeout();
  }
}
