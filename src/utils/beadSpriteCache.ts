import { BeadPaletteItem } from '../types';

const EMPTY_KEY = '__EMPTY__';

export class BeadSpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private _currentScale = 0;

  get currentScale(): number {
    return this._currentScale;
  }

  prepare(scale: number, palette: BeadPaletteItem[]): void {
    if (scale === this._currentScale && this.cache.size > 0) return;
    this.cache.clear();
    this._currentScale = scale;

    for (const bead of palette) {
      const canvas = document.createElement('canvas');
      canvas.width = scale;
      canvas.height = scale;
      const ctx = canvas.getContext('2d')!;
      drawFilledBead(ctx, bead.hex, scale);
      this.cache.set(bead.hex, canvas);
    }

    // Empty bead: transparent bg + circle outline
    const empty = document.createElement('canvas');
    empty.width = scale;
    empty.height = scale;
    const ectx = empty.getContext('2d')!;
    ectx.strokeStyle = '#e2e8f0';
    ectx.lineWidth = 1;
    ectx.beginPath();
    ectx.arc(scale / 2, scale / 2, Math.max(2, scale / 5), 0, 2 * Math.PI);
    ectx.stroke();
    this.cache.set(EMPTY_KEY, empty);
  }

  get(hex: string): HTMLCanvasElement | undefined {
    return this.cache.get(hex);
  }

  getEmpty(): HTMLCanvasElement | undefined {
    return this.cache.get(EMPTY_KEY);
  }
}

function drawFilledBead(ctx: CanvasRenderingContext2D, hex: string, scale: number): void {
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, scale, scale);

  if (scale >= 10) {
    const cx = scale / 2;
    const cy = scale / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, scale / 3.2, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(cx, cy, scale / 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
}
