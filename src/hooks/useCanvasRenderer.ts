import { useEffect, useRef, useCallback, RefObject } from 'react';
import { TransformedPixel } from '../types';
import { hexToRgb } from '../colorUtils';

interface Params {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  transformedPixels: TransformedPixel[];
  gridWidth: number;
  gridHeight: number;
  scale: number;
  showNumbers: boolean;
  showRulers: boolean;
  selectedBeadHighlight: string | null;
  editMode: boolean;
  selectedCell: { x: number; y: number } | null;
  wandMode: boolean;
  wandSelection: Set<string>;
}

export function useCanvasRenderer({ canvasRef, transformedPixels, gridWidth, gridHeight, scale, showNumbers, showRulers, selectedBeadHighlight, editMode, selectedCell, wandMode, wandSelection }: Params) {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Always-fresh overlay params — updated every render, no stale closure risk
  const overlayRef = useRef({ scale, showRulers, editMode, selectedCell, wandMode, wandSelection });
  overlayRef.current = { scale, showRulers, editMode, selectedCell, wandMode, wandSelection };

  // Composite offscreen → main canvas, then draw edit overlays (cheap)
  const composite = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;
    const { scale, showRulers, editMode, selectedCell, wandMode, wandSelection } = overlayRef.current;

    canvas.width = offscreen.width;
    canvas.height = offscreen.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(offscreen, 0, 0);

    const rulerSize = showRulers ? 32 : 0;
    ctx.save();
    ctx.translate(rulerSize, rulerSize);

    if (editMode && selectedCell) {
      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
      ctx.strokeRect(selectedCell.x * scale + 1, selectedCell.y * scale + 1, scale - 2, scale - 2);
      ctx.setLineDash([]);
    }
    if (editMode && wandMode && wandSelection.size > 0) {
      ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
      wandSelection.forEach(key => {
        const [sx, sy] = key.split(',').map(Number);
        ctx.strokeRect(sx * scale + 1.5, sy * scale + 1.5, scale - 3, scale - 3);
      });
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, []); // stable reference — reads from refs

  // Heavy effect: rebuild offscreen pixel layer
  useEffect(() => {
    if (!canvasRef.current || transformedPixels.length === 0) return;
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const offscreen = offscreenRef.current;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const rulerSize = showRulers ? 32 : 0;
    const gw = gridWidth * scale, gh = gridHeight * scale;
    offscreen.width = gw + rulerSize;
    offscreen.height = gh + rulerSize;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.save();
    ctx.translate(rulerSize, rulerSize);

    // Checkerboard
    const cs = 8;
    for (let y = 0; y < gh; y += cs)
      for (let x = 0; x < gw; x += cs)
        if (((x / cs) + (y / cs)) % 2 === 0) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(x, y, cs, cs); }

    // Pixels
    transformedPixels.forEach(p => {
      const hl = selectedBeadHighlight === null || p.matchedBead.code === selectedBeadHighlight;
      if (p.matchedBead.code === 'EMPTY') {
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, Math.max(2, scale / 5), 0, 2 * Math.PI); ctx.stroke();
        return;
      }
      ctx.fillStyle = p.matchedBead.hex;
      if (!hl) { ctx.save(); ctx.globalAlpha = 0.12; ctx.fillRect(p.x * scale, p.y * scale, scale, scale); ctx.restore(); }
      else ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
      if (scale >= 10 && hl) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 3.2, 0, 2 * Math.PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 5, 0, 2 * Math.PI); ctx.stroke();
        ctx.restore();
      }
    });

    // Grid lines
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.5;
    for (let x = 1; x < gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, gh); ctx.stroke(); }
    for (let y = 1; y < gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(gw, y * scale); ctx.stroke(); }

    // Reference lines
    for (let x = 1; x < gridWidth; x++) {
      if (x % 10 === 0) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.setLineDash([]); }
      else if (x % 5 === 0) { ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.0; ctx.setLineDash([4, 4]); }
      else continue;
      ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, gh); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let y = 1; y < gridHeight; y++) {
      if (y % 10 === 0) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.setLineDash([]); }
      else if (y % 5 === 0) { ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.0; ctx.setLineDash([4, 4]); }
      else continue;
      ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(gw, y * scale); ctx.stroke(); ctx.setLineDash([]);
    }

    // Number overlays
    if (showNumbers && scale >= 16) {
      transformedPixels.forEach(p => {
        if (p.matchedBead.code === 'EMPTY') return;
        if (selectedBeadHighlight !== null && p.matchedBead.code !== selectedBeadHighlight) return;
        const rgb = hexToRgb(p.matchedBead.hex);
        ctx.fillStyle = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) > 140 ? '#0F172A' : '#FFFFFF';
        ctx.font = `bold ${Math.floor(scale / 2.5)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.matchedBead.code, p.x * scale + scale / 2, p.y * scale + scale / 2 + 0.5);
      });
    }

    // Rulers
    if (showRulers) {
      ctx.fillStyle = '#64748B';
      ctx.font = `bold ${Math.max(9, Math.min(11, scale / 1.5))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (let x = 0; x < gridWidth; x++)
        if (scale >= 14 || (x + 1) % 5 === 0 || x === 0 || x === gridWidth - 1)
          ctx.fillText((x + 1).toString(), x * scale + scale / 2, -6);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let y = 0; y < gridHeight; y++)
        if (scale >= 14 || (y + 1) % 5 === 0 || y === 0 || y === gridHeight - 1)
          ctx.fillText((y + 1).toString(), -6, y * scale + scale / 2);
    }

    ctx.restore();
    composite();
  }, [transformedPixels, scale, gridWidth, gridHeight, showNumbers, showRulers, selectedBeadHighlight, composite]);

  // Light effect: only overlay changed — skip pixel redraw entirely
  useEffect(() => {
    composite();
  }, [editMode, selectedCell, wandMode, wandSelection, composite]);
}
