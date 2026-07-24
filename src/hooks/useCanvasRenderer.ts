import { useEffect, useRef, useCallback, RefObject } from 'react';
import { TransformedPixel } from '../types';
import { hexToRgb, luminance } from '../colorUtils';
import { useWorkspaceStore } from '../store/workspaceStore';
import { BeadSpriteCache } from '../utils/beadSpriteCache';
import { BEAD_PALETTE } from '../data/palette';

interface Params {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  transformedPixels: TransformedPixel[];
  gridWidth: number;
  gridHeight: number;
  scale: number;
  showNumbers: boolean;
  showRulers: boolean;
  selectedBeadHighlight: string | null;
  hoverBeadHighlight: string | null;
  editMode: boolean;
  selectedCell: { x: number; y: number } | null;
  wandMode: boolean;
  wandSelection: Set<string>;
}

function allocCanvas(
  ref: { current: HTMLCanvasElement | null },
  w: number,
  h: number,
): CanvasRenderingContext2D {
  if (!ref.current) ref.current = document.createElement('canvas');
  if (ref.current.width !== w || ref.current.height !== h) {
    ref.current.width = w;
    ref.current.height = h;
  }
  return ref.current.getContext('2d')!;
}

function renderBgLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  ew: number,
  eh: number,
  scale: number,
  rulerSize: number,
): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(rulerSize, rulerSize);

  const gw = ew * scale, gh = eh * scale;
  const cs = 8;
  for (let y = 0; y < gh; y += cs)
    for (let x = 0; x < gw; x += cs)
      if (((x / cs) + (y / cs)) % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x, y, cs, cs);
      }

  ctx.restore();
}

function renderPixelLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  scale: number,
  rulerSize: number,
  xOff: number,
  yOff: number,
  pixels: TransformedPixel[],
  leftTrim: number,
  rightTrim: number,
  topTrim: number,
  bottomTrim: number,
  gridWidth: number,
  gridHeight: number,
  highlight: string | null,
  sprites: BeadSpriteCache,
): void {
  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(rulerSize, rulerSize);

  pixels.forEach(p => {
    if (p.x < leftTrim || p.x >= gridWidth - rightTrim || p.y < topTrim || p.y >= gridHeight - bottomTrim) return;
    const rx = (p.x - xOff) * scale;
    const ry = (p.y - yOff) * scale;
    const hl = highlight === null || p.matchedBead.code === highlight;
    if (p.matchedBead.code === 'EMPTY') {
      ctx.drawImage(sprites.getEmpty()!, rx, ry);
      return;
    }
    if (!hl) {
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillRect(rx, ry, scale, scale); ctx.restore();
    } else {
      ctx.drawImage(sprites.get(p.matchedBead.hex)!, rx, ry);
    }
  });

  ctx.restore();
}

function renderGridLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  ew: number,
  eh: number,
  scale: number,
  rulerSize: number,
): void {
  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(rulerSize, rulerSize);

  const gw = ew * scale, gh = eh * scale;

  // 弱化普通网格线 — 仅在 scale >= 10 时绘制
  if (scale >= 10) {
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 0.5;
    for (let x = 1; x < ew; x++) { ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, gh); ctx.stroke(); }
    for (let y = 1; y < eh; y++) { ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(gw, y * scale); ctx.stroke(); }
  } else {
    // 极低缩放：仅绘制外框
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, gw, gh);
  }

  // 5/10 参考线 — 降低对比度
  for (let x = 1; x < ew; x++) {
    if (x % 10 === 0) { ctx.strokeStyle = '#FCA5A5'; ctx.lineWidth = 1.0; ctx.setLineDash([]); }
    else if (x % 5 === 0) { ctx.strokeStyle = '#FECACA'; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]); }
    else continue;
    ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, gh); ctx.stroke(); ctx.setLineDash([]);
  }
  for (let y = 1; y < eh; y++) {
    if (y % 10 === 0) { ctx.strokeStyle = '#FCA5A5'; ctx.lineWidth = 1.0; ctx.setLineDash([]); }
    else if (y % 5 === 0) { ctx.strokeStyle = '#FECACA'; ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]); }
    else continue;
    ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(gw, y * scale); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.restore();
}

function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  scale: number,
  rulerSize: number,
  xOff: number,
  yOff: number,
  pixels: TransformedPixel[],
  leftTrim: number,
  rightTrim: number,
  topTrim: number,
  bottomTrim: number,
  gridWidth: number,
  gridHeight: number,
  showNumbers: boolean,
  showRulers: boolean,
  highlight: string | null,
  hoverHighlight: string | null,
): void {
  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(rulerSize, rulerSize);

  const ew = gridWidth - leftTrim - rightTrim;
  const eh = gridHeight - topTrim - bottomTrim;

  // 分级显示：highlight/hover 色号始终显示；普通色号 scale >= 13 显示（约 90%）
  const alwaysShowCode = highlight ?? hoverHighlight;
  if (showNumbers) {
    const fontSize = Math.max(8, Math.floor(scale / 2.5));
    const showNormal = scale >= 13;
    if (showNormal || alwaysShowCode) {
      pixels.forEach(p => {
        if (p.matchedBead.code === 'EMPTY') return;
        if (p.x < leftTrim || p.x >= gridWidth - rightTrim || p.y < topTrim || p.y >= gridHeight - bottomTrim) return;
        const code = p.matchedBead.code;
        // 高亮模式下仅画高亮色；否则普通缩放显示所有，或仅画 hover 色
        if (highlight !== null && code !== highlight) return;
        if (highlight === null && !showNormal && code !== hoverHighlight) return;
        const rgb = hexToRgb(p.matchedBead.hex);
        ctx.fillStyle = luminance(rgb) > 140 ? '#0F172A' : '#FFFFFF';
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(code, (p.x - xOff) * scale + scale / 2, (p.y - yOff) * scale + scale / 2 + 0.5);
      });
    }
  }

  if (showRulers) {
    ctx.fillStyle = '#64748B';
    ctx.font = `bold ${Math.max(9, Math.min(11, scale / 1.5))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let x = 0; x < ew; x++)
      if (scale >= 14 || (x + 1) % 5 === 0 || x === 0 || x === ew - 1)
        ctx.fillText((x + 1).toString(), x * scale + scale / 2, -6);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = 0; y < eh; y++)
      if (scale >= 14 || (y + 1) % 5 === 0 || y === 0 || y === eh - 1)
        ctx.fillText((y + 1).toString(), -6, y * scale + scale / 2);
  }

  ctx.restore();
}

function findChangedCells(oldPixels: TransformedPixel[], newPixels: TransformedPixel[]): Set<number> | null {
  if (oldPixels.length !== newPixels.length) return null;
  const changed = new Set<number>();
  for (let i = 0; i < newPixels.length; i++) {
    if (oldPixels[i] !== newPixels[i]) changed.add(i);
  }
  if (changed.size > newPixels.length * 0.05) return null;
  return changed;
}

function renderPixelDirty(
  ctx: CanvasRenderingContext2D,
  scale: number,
  rulerSize: number,
  xOff: number,
  yOff: number,
  changed: Set<number>,
  pixels: TransformedPixel[],
  highlight: string | null,
  sprites: BeadSpriteCache,
): void {
  ctx.save();
  ctx.translate(rulerSize, rulerSize);
  for (const idx of changed) {
    const p = pixels[idx];
    const rx = (p.x - xOff) * scale;
    const ry = (p.y - yOff) * scale;
    ctx.clearRect(rx, ry, scale, scale);
    if (p.matchedBead.code === 'EMPTY') {
      ctx.drawImage(sprites.getEmpty()!, rx, ry);
    } else {
      const hl = highlight === null || p.matchedBead.code === highlight;
      if (!hl) {
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillRect(rx, ry, scale, scale); ctx.restore();
      } else {
        ctx.drawImage(sprites.get(p.matchedBead.hex)!, rx, ry);
      }
    }
  }
  ctx.restore();
}

export function useCanvasRenderer({ canvasRef, transformedPixels, gridWidth, gridHeight, scale, showNumbers, showRulers, selectedBeadHighlight, hoverBeadHighlight, editMode, selectedCell, wandMode, wandSelection }: Params) {
  const bgLayerRef = useRef<HTMLCanvasElement | null>(null);
  const pixelLayerRef = useRef<HTMLCanvasElement | null>(null);
  const gridLayerRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLCanvasElement | null>(null);

  const topTrim = useWorkspaceStore(s => s.topTrim);
  const bottomTrim = useWorkspaceStore(s => s.bottomTrim);
  const leftTrim = useWorkspaceStore(s => s.leftTrim);
  const rightTrim = useWorkspaceStore(s => s.rightTrim);
  const effectiveW = gridWidth - leftTrim - rightTrim;
  const effectiveH = gridHeight - topTrim - bottomTrim;

  const overlayRef = useRef({ scale, showRulers, editMode, selectedCell, wandMode, wandSelection, leftTrim, topTrim, bottomTrim, rightTrim, gridWidth, gridHeight });
  overlayRef.current = { scale, showRulers, editMode, selectedCell, wandMode, wandSelection, leftTrim, topTrim, bottomTrim, rightTrim, gridWidth, gridHeight };

  const spriteCacheRef = useRef<BeadSpriteCache>(null!);
  if (!spriteCacheRef.current) spriteCacheRef.current = new BeadSpriteCache();

  const composite = useCallback(() => {
    const canvas = canvasRef.current;
    const bg = bgLayerRef.current;
    if (!canvas || !bg) return;
    canvas.width = bg.width;
    canvas.height = bg.height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(bg, 0, 0);
    if (pixelLayerRef.current) ctx.drawImage(pixelLayerRef.current, 0, 0);
    if (gridLayerRef.current) ctx.drawImage(gridLayerRef.current, 0, 0);
    if (textLayerRef.current) ctx.drawImage(textLayerRef.current, 0, 0);

    const { scale, showRulers, editMode, selectedCell, wandMode, wandSelection, leftTrim, topTrim, bottomTrim, rightTrim, gridWidth } = overlayRef.current;

    const rulerSize = showRulers ? 32 : 0;
    ctx.save();
    ctx.translate(rulerSize, rulerSize);

    const ew_eff = gridWidth - rightTrim - leftTrim;
    const eh_eff = overlayRef.current.gridHeight - bottomTrim - topTrim;
    const gw_eff = ew_eff * scale;
    const gh_eff = eh_eff * scale;

    const inBounds = (sx: number, sy: number) => sx >= leftTrim && sx < gridWidth - rightTrim && sy >= topTrim && sy < (overlayRef.current.gridHeight) - bottomTrim;

    if (editMode && selectedCell && inBounds(selectedCell.x, selectedCell.y)) {
      const sx = (selectedCell.x - leftTrim) * scale;
      const sy = (selectedCell.y - topTrim) * scale;
      // 行列辅助线 — 淡蓝十字
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.18)'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sx + scale / 2, 0); ctx.lineTo(sx + scale / 2, gh_eff); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, sy + scale / 2); ctx.lineTo(gw_eff, sy + scale / 2); ctx.stroke();
      // 选中框
      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
      ctx.strokeRect(sx + 1, sy + 1, scale - 2, scale - 2);
      ctx.setLineDash([]);
    }
    if (editMode && wandMode && wandSelection.size > 0) {
      ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
      wandSelection.forEach(key => {
        const [sx, sy] = key.split(',').map(Number);
        if (inBounds(sx, sy)) ctx.strokeRect((sx - leftTrim) * scale + 1.5, (sy - topTrim) * scale + 1.5, scale - 3, scale - 3);
      });
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, []);

  const prevRef = useRef({
    scale: 0, gridWidth: 0, gridHeight: 0,
    showNumbers: false, showRulers: false,
    selectedBeadHighlight: null as string | null,
    hoverBeadHighlight: null as string | null,
    leftTrim: 0, rightTrim: 0, topTrim: 0, bottomTrim: 0,
  });
  const prevPixelsRef = useRef(transformedPixels);

  useEffect(() => {
    if (!canvasRef.current || transformedPixels.length === 0) return;

    spriteCacheRef.current.prepare(scale, BEAD_PALETTE);

    const rulerSize = showRulers ? 32 : 0;
    const ew = effectiveW > 0 ? effectiveW : gridWidth;
    const eh = effectiveH > 0 ? effectiveH : gridHeight;
    const gw = ew * scale, gh = eh * scale;
    const cw = gw + rulerSize, ch = gh + rulerSize;
    const xOff = effectiveW > 0 ? leftTrim : 0;
    const yOff = effectiveH > 0 ? topTrim : 0;

    const prev = prevRef.current;
    const pixelsChanged = transformedPixels !== prevPixelsRef.current;
    const scaleChanged = scale !== prev.scale;
    const dimsChanged = gridWidth !== prev.gridWidth || gridHeight !== prev.gridHeight;
    const rulersChanged = showRulers !== prev.showRulers;
    const trimChanged = leftTrim !== prev.leftTrim || rightTrim !== prev.rightTrim || topTrim !== prev.topTrim || bottomTrim !== prev.bottomTrim;
    const hlChanged = selectedBeadHighlight !== prev.selectedBeadHighlight;
    const hoverChanged = hoverBeadHighlight !== prev.hoverBeadHighlight;
    const showNumbersChanged = showNumbers !== prev.showNumbers;

    const needsBg = scaleChanged || dimsChanged || rulersChanged || trimChanged;
    const needsPixels = pixelsChanged || scaleChanged || dimsChanged || trimChanged || hlChanged;
    const needsGrid = scaleChanged || dimsChanged || rulersChanged || trimChanged;
    const needsText = scaleChanged || dimsChanged || trimChanged || hlChanged || hoverChanged || showNumbersChanged || rulersChanged || (pixelsChanged && showNumbers);

    if (needsBg) renderBgLayer(allocCanvas(bgLayerRef, cw, ch), cw, ch, ew, eh, scale, rulerSize);
    if (needsPixels) {
      const pctx = allocCanvas(pixelLayerRef, cw, ch);
      if (scaleChanged || dimsChanged || trimChanged || hlChanged) {
        renderPixelLayer(pctx, cw, ch, scale, rulerSize, xOff, yOff, transformedPixels, leftTrim, rightTrim, topTrim, bottomTrim, gridWidth, gridHeight, selectedBeadHighlight, spriteCacheRef.current);
      } else if (pixelsChanged) {
        const changed = findChangedCells(prevPixelsRef.current, transformedPixels);
        if (changed) {
          renderPixelDirty(pctx, scale, rulerSize, xOff, yOff, changed, transformedPixels, selectedBeadHighlight, spriteCacheRef.current);
        } else {
          renderPixelLayer(pctx, cw, ch, scale, rulerSize, xOff, yOff, transformedPixels, leftTrim, rightTrim, topTrim, bottomTrim, gridWidth, gridHeight, selectedBeadHighlight, spriteCacheRef.current);
        }
      }
    }
    if (needsGrid) renderGridLayer(allocCanvas(gridLayerRef, cw, ch), cw, ch, ew, eh, scale, rulerSize);
    if (needsText) renderTextLayer(allocCanvas(textLayerRef, cw, ch), cw, ch, scale, rulerSize, xOff, yOff, transformedPixels, leftTrim, rightTrim, topTrim, bottomTrim, gridWidth, gridHeight, showNumbers, showRulers, selectedBeadHighlight, hoverBeadHighlight);

    composite();

    prevRef.current = { scale, gridWidth, gridHeight, showNumbers, showRulers, selectedBeadHighlight, hoverBeadHighlight, leftTrim, rightTrim, topTrim, bottomTrim };
    prevPixelsRef.current = transformedPixels;
  }, [transformedPixels, scale, gridWidth, gridHeight, showNumbers, showRulers, selectedBeadHighlight, hoverBeadHighlight, topTrim, bottomTrim, leftTrim, rightTrim, composite]);

  useEffect(() => {
    composite();
  }, [editMode, selectedCell, wandMode, wandSelection, composite]);
}
