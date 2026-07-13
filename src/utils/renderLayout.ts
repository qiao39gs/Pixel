import { TransformedPixel, IngredientStat } from '../types';
import { RGB, hexToRgb, luminance } from '../colorUtils';

export interface RenderAdapter {
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillCircle(cx: number, cy: number, r: number): void;
  strokeCircle(cx: number, cy: number, r: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  fillText(text: string, x: number, y: number): void;
  setFillStyle(style: string): void;
  setStrokeStyle(style: string): void;
  setLineWidth(w: number): void;
  setLineDash(dash: number[] | null): void;
  setFont(font: string): void;
  setTextAlign(align: 'left' | 'center' | 'right'): void;
  setTextBaseline(baseline: 'top' | 'middle' | 'alphabetic' | 'bottom'): void;
  measureText(text: string): number;
  luminanceOf(hex: string): number;
  contrastColor(hex: string, dark?: string, light?: string): string;
  pushState(): void;
  popState(): void;
  translate(x: number, y: number): void;
}

export function createCanvasAdapter(ctx: CanvasRenderingContext2D): RenderAdapter {
  return {
    fillRect: (x, y, w, h) => ctx.fillRect(x, y, w, h),
    strokeRect: (x, y, w, h) => ctx.strokeRect(x, y, w, h),
    fillCircle: (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill(); },
    strokeCircle: (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke(); },
    line: (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
    fillText: (text, x, y) => ctx.fillText(text, x, y),
    setFillStyle: (s) => { ctx.fillStyle = s; },
    setStrokeStyle: (s) => { ctx.strokeStyle = s; },
    setLineWidth: (w) => { ctx.lineWidth = w; },
    setLineDash: (dash) => { ctx.setLineDash(dash ?? []); },
    setFont: (font) => { ctx.font = font; },
    setTextAlign: (align) => { ctx.textAlign = align; },
    setTextBaseline: (baseline) => { ctx.textBaseline = baseline; },
    measureText: (text) => ctx.measureText(text).width,
    luminanceOf: (hex) => luminance(hexToRgb(hex)),
    contrastColor: (hex, dark = '#1C1B1A', light = '#FFFFFF') => luminance(hexToRgb(hex)) > 140 ? dark : light,
    pushState: () => ctx.save(),
    popState: () => ctx.restore(),
    translate: (x, y) => ctx.translate(x, y),
  };
}

export interface GridRenderOptions {
  scale: number;
  gridWidth: number;
  gridHeight: number;
  showRulers: boolean;
  showNumbers: boolean;
  offsetX: number;
  offsetY: number;
}

export function renderGrid(a: RenderAdapter, pixels: TransformedPixel[], opts: GridRenderOptions): void {
  const { scale, gridWidth, gridHeight, showRulers, showNumbers, offsetX, offsetY } = opts;
  const gw = gridWidth * scale, gh = gridHeight * scale;

  a.pushState();
  a.translate(offsetX, offsetY);

  // Rulers
  if (showRulers) {
    a.setFillStyle('#9B958C');
    a.setFont('12px "JetBrains Mono", monospace');
    a.setTextAlign('center');
    a.setTextBaseline('alphabetic');
    for (let x = 1; x <= gridWidth; x++) a.fillText(x.toString(), (x - 1) * scale + scale / 2, -14);
    a.setTextAlign('right');
    a.setTextBaseline('middle');
    for (let y = 1; y <= gridHeight; y++) a.fillText(y.toString(), -14, (y - 1) * scale + scale / 2);
  }

  // Pixel blocks
  pixels.forEach(p => {
    const px = p.x * scale, py = p.y * scale;
    if (p.matchedBead.code === 'EMPTY') {
      a.setStrokeStyle('#E8E3DB');
      a.setLineWidth(1);
      a.strokeCircle(px + scale / 2, py + scale / 2, scale / 8);
      return;
    }
    a.setFillStyle(p.matchedBead.hex);
    a.fillRect(px, py, scale, scale);
    // bead texture
    a.setStrokeStyle('rgba(255,255,255,0.18)');
    a.setLineWidth(2.0);
    a.strokeCircle(px + scale / 2, py + scale / 2, scale / 3.2);
    a.setStrokeStyle('rgba(0,0,0,0.08)');
    a.strokeCircle(px + scale / 2, py + scale / 2, scale / 5);
    if (showNumbers) {
      a.setFillStyle(a.contrastColor(p.matchedBead.hex));
      a.setFont(`bold ${Math.floor(scale / 2.5)}px "JetBrains Mono", monospace`);
      a.setTextAlign('center');
      a.setTextBaseline('middle');
      a.fillText(p.matchedBead.code, px + scale / 2, py + scale / 2 + 1);
    }
  });

  // Grid lines
  a.setStrokeStyle('#E8E3DB');
  a.setLineWidth(0.5);
  a.setLineDash(null);
  for (let x = 1; x < gridWidth; x++) a.line(x * scale, 0, x * scale, gh);
  for (let y = 1; y < gridHeight; y++) a.line(0, y * scale, gw, y * scale);

  // Pegboard alignment lines (5/10)
  for (let x = 1; x < gridWidth; x++) {
    if (x % 10 === 0) {
      a.setStrokeStyle('#E8570A'); a.setLineWidth(2.0); a.setLineDash(null);
      a.line(x * scale, 0, x * scale, gh);
    } else if (x % 5 === 0) {
      a.setStrokeStyle('rgba(232,87,10,0.4)'); a.setLineWidth(1.0); a.setLineDash([6, 6]);
      a.line(x * scale, 0, x * scale, gh);
    }
  }
  for (let y = 1; y < gridHeight; y++) {
    if (y % 10 === 0) {
      a.setStrokeStyle('#E8570A'); a.setLineWidth(2.0); a.setLineDash(null);
      a.line(0, y * scale, gw, y * scale);
    } else if (y % 5 === 0) {
      a.setStrokeStyle('rgba(232,87,10,0.4)'); a.setLineWidth(1.0); a.setLineDash([6, 6]);
      a.line(0, y * scale, gw, y * scale);
    }
  }
  a.setLineDash(null);

  // Frame
  a.setStrokeStyle('#D4CFC4');
  a.setLineWidth(2);
  a.strokeRect(0, 0, gw, gh);

  a.popState();
}

export interface ChunkRenderOptions {
  cellSize: number;
  chunkWidth: number;
  chunkHeight: number;
  startGridX: number;
  startGridY: number;
  endGridX: number;
  endGridY: number;
  offsetX: number;
  offsetY: number;
  gridWidth: number;
  showRulers: boolean;
  showNumbers: boolean;
}

export function renderGridChunk(a: RenderAdapter, pixels: TransformedPixel[], opts: ChunkRenderOptions): void {
  const { cellSize, chunkWidth, chunkHeight, startGridX, startGridY, endGridX, endGridY, offsetX, offsetY, gridWidth, showRulers, showNumbers } = opts;
  const drawW = chunkWidth * cellSize, drawH = chunkHeight * cellSize;

  a.pushState();
  a.translate(offsetX, offsetY);

  // Rulers
  if (showRulers) {
    a.setFillStyle('#94A3B8');
    a.setFont('7px "helvetica", "sans-serif"');
    a.setTextAlign('center');
    a.setTextBaseline('alphabetic');
    for (let x = startGridX; x < endGridX; x++) {
      const li = x - startGridX;
      a.fillText((x + 1).toString(), li * cellSize + cellSize / 2, -2);
    }
    a.setTextAlign('right');
    a.setTextBaseline('middle');
    for (let y = startGridY; y < endGridY; y++) {
      const li = y - startGridY;
      a.fillText((y + 1).toString(), -2, li * cellSize + cellSize / 2);
    }
  }

  // Cells
  for (let y = startGridY; y < endGridY; y++) {
    for (let x = startGridX; x < endGridX; x++) {
      const pixel = pixels[y * gridWidth + x];
      const rx = (x - startGridX) * cellSize;
      const ry = (y - startGridY) * cellSize;
      if (!pixel || pixel.matchedBead.code === 'EMPTY') {
        a.setStrokeStyle('#E2E8F0');
        a.setLineWidth(0.1);
        a.strokeCircle(rx + cellSize / 2, ry + cellSize / 2, cellSize / 9);
        continue;
      }
      a.setFillStyle(pixel.matchedBead.hex);
      a.fillRect(rx, ry, cellSize, cellSize);
      if (showNumbers) {
        a.setFillStyle(a.contrastColor(pixel.matchedBead.hex, '#0F172A', '#FFFFFF'));
        a.setFont(`bold ${Math.max(4, cellSize * 1.5)}px "helvetica", "sans-serif"`);
        a.setTextAlign('center');
        a.setTextBaseline('middle');
        a.fillText(pixel.matchedBead.code, rx + cellSize / 2, ry + cellSize / 2 + 0.4);
      }
    }
  }

  // Grid lines
  a.setStrokeStyle('#CBD5E1');
  a.setLineWidth(0.1);
  a.setLineDash(null);
  for (let x = 0; x <= chunkWidth; x++) a.line(x * cellSize, 0, x * cellSize, drawH);
  for (let y = 0; y <= chunkHeight; y++) a.line(0, y * cellSize, drawW, y * cellSize);

  // Locator lines (5/10)
  a.setLineWidth(0.4);
  for (let x = startGridX; x <= endGridX; x++) {
    if (x > startGridX && x % 10 === 0) {
      a.setStrokeStyle('#EF4444'); a.setLineDash(null);
      a.line((x - startGridX) * cellSize, 0, (x - startGridX) * cellSize, drawH);
    } else if (x > startGridX && x % 5 === 0) {
      a.setStrokeStyle('#F87171'); a.setLineDash([4, 4]);
      a.line((x - startGridX) * cellSize, 0, (x - startGridX) * cellSize, drawH);
    }
  }
  for (let y = startGridY; y <= endGridY; y++) {
    if (y > startGridY && y % 10 === 0) {
      a.setStrokeStyle('#EF4444'); a.setLineDash(null);
      a.line(0, (y - startGridY) * cellSize, drawW, (y - startGridY) * cellSize);
    } else if (y > startGridY && y % 5 === 0) {
      a.setStrokeStyle('#F87171'); a.setLineDash([4, 4]);
      a.line(0, (y - startGridY) * cellSize, drawW, (y - startGridY) * cellSize);
    }
  }
  a.setLineDash(null);

  // Outer border
  a.setStrokeStyle('#475569');
  a.setLineWidth(0.5);
  a.strokeRect(0, 0, drawW, drawH);

  a.popState();
}
