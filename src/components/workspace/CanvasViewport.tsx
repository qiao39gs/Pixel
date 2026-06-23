import React, { useRef } from 'react';
import { LayoutGrid, Award } from 'lucide-react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import { COLOR_GROUPS } from '../../data/palette';
import { hexToRgb } from '../../colorUtils';
import { EMPTY_BEAD, floodFill as doFloodFill } from '../../utils/editOperations';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isProcessing: boolean;
  panOffset: { x: number; y: number };
  isPanning: boolean;
  panStart: { x: number; y: number };
  editMode: boolean;
  brushBead: BeadPaletteItem | null;
  isEraser: boolean;
  wandMode: boolean;
  wandSelection: Set<string>;
  selectedCell: { x: number; y: number } | null;
  showPalettePanel: boolean;
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
  selectedBeadHighlight: string | null;
  gridWidth: number;
  gridHeight: number;
  statsCount: number;
  showRulers: boolean;
  showNumbers: boolean;
  scale: number;
  transformedPixels: TransformedPixel[];
  stats: IngredientStat[];
  setIsPanning: (v: boolean) => void;
  setPanOffset: (v: { x: number; y: number }) => void;
  setPanStart: (v: { x: number; y: number }) => void;
  setEditMode: (v: boolean) => void;
  setBrushBead: (v: BeadPaletteItem | null) => void;
  setSelectedCell: (v: { x: number; y: number } | null) => void;
  setIsEraser: (v: boolean) => void;
  setWandMode: (v: boolean) => void;
  setWandSelection: (v: Set<string>) => void;
  setShowPalettePanel: (v: boolean) => void;
  setSelectedBeadHighlight: (v: string | null) => void;
  applyBrush: (x: number, y: number) => void;
  applyWandFill: (cell: { x: number; y: number }, selection: Set<string>, targetBead: BeadPaletteItem) => void;
  pushUndo: () => void;
  onUndo: () => void;
  onDenoise: () => void;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
}

export default function CanvasViewport({ canvasRef, containerRef, isProcessing, panOffset, isPanning, panStart, editMode, brushBead, isEraser, wandMode, wandSelection, selectedCell, showPalettePanel, currentPalette, selectedBeadHighlight, gridWidth, gridHeight, statsCount, showRulers, showNumbers, scale, transformedPixels, stats, setIsPanning, setPanOffset, setPanStart, setEditMode, setBrushBead, setSelectedCell, setIsEraser, setWandMode, setWandSelection, setShowPalettePanel, setSelectedBeadHighlight, applyBrush, applyWandFill, pushUndo, onUndo, onDenoise, onGeneratePng, onGeneratePdf }: Props) {
  const editDragRef = useRef(false);
  const editFilledRef = useRef(new Set<string>());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPickedRef = useRef(false);
  const touchStartCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const coordToGrid = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const rulerSize = showRulers ? 32 : 0;
    const mx = (clientX - rect.left) * scaleX - rulerSize;
    const my = (clientY - rect.top) * scaleY - rulerSize;
    const gx = Math.floor(mx / scale), gy = Math.floor(my / scale);
    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return null;
    return { x: gx, y: gy };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editMode) {
      if (e.button === 2) {
        e.preventDefault();
        const cell = coordToGrid(e.clientX, e.clientY);
        if (cell) { const p = transformedPixels[cell.y * gridWidth + cell.x]; if (p && p.matchedBead.code !== 'EMPTY') { setBrushBead(p.matchedBead); setSelectedCell(cell); } }
        return;
      }
      if (e.button === 0) {
        if (wandMode) {
          const cell = coordToGrid(e.clientX, e.clientY);
          if (cell) {
            if (brushBead || isEraser) {
              const sel = doFloodFill(transformedPixels, cell.x, cell.y, gridWidth, gridHeight);
              pushUndo();
              applyWandFill(cell, sel, isEraser ? EMPTY_BEAD : brushBead!);
            } else {
              setWandSelection(doFloodFill(transformedPixels, cell.x, cell.y, gridWidth, gridHeight));
              setSelectedCell(cell);
            }
          }
          return;
        }
        if (brushBead || isEraser) {
          editDragRef.current = true; editFilledRef.current.clear();
          const cell = coordToGrid(e.clientX, e.clientY);
          if (cell) applyBrush(cell.x, cell.y);
        } else {
          setSelectedCell(coordToGrid(e.clientX, e.clientY));
        }
        return;
      }
    }
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMoveEdit = (e: React.MouseEvent) => {
    if (!editDragRef.current || (!brushBead && !isEraser)) return;
    const cell = coordToGrid(e.clientX, e.clientY);
    if (!cell) return;
    const key = `${cell.x},${cell.y}`;
    if (editFilledRef.current.has(key)) return;
    editFilledRef.current.add(key);
    applyBrush(cell.x, cell.y);
  };

  const handleMouseUp = () => {
    if (editDragRef.current) { editDragRef.current = false; editFilledRef.current.clear(); return; }
    setIsPanning(false);
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  return (
    <div className="bg-slate-950 border border-[#1D1D21] rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden min-h-[300px] md:min-h-[500px] transition-all">
        {/* Toolbar header */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-white/[0.04] z-10">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xs font-bold px-2.5 py-1 bg-white/[0.06] border border-white/[0.04] rounded-lg text-slate-300 font-mono">{gridWidth} × {gridHeight} 画幅规格</span>
            <span className="text-xs text-slate-400 font-semibold">( 最终已精准出数: <strong className="text-indigo-400">{statsCount} 色</strong> )</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setEditMode(!editMode); setBrushBead(null); setSelectedCell(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); }}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${editMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'}`}
            >{editMode ? ' 编辑中' : ' 手动编辑'}</button>
            {editMode && <button onClick={onUndo} className="px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]" title="撤销 (Ctrl+Z)"> 撤销</button>}
            {editMode && <>
              <button onClick={() => { setIsEraser(!isEraser); setBrushBead(null); }} className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${isEraser ? 'bg-red-500 text-white border-red-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'}`}> 橡皮擦</button>
              <button onClick={onDenoise} className="px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30"> 去杂色</button>
              <button onClick={() => { setWandMode(!wandMode); setWandSelection(new Set()); setIsEraser(false); }} className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${wandMode ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30'}`}> 魔棒</button>
              {wandMode && wandSelection.size > 0 && <span className="text-[10px] text-cyan-400 font-mono">已选{wandSelection.size}格</span>}
              <button onClick={() => setShowPalettePanel(!showPalettePanel)} className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${showPalettePanel ? 'bg-violet-500 text-white border-violet-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30'}`}> 色板</button>
            </>}
            {editMode && brushBead && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brushBead.hex }} />
                <span className="text-[10px] font-bold text-amber-400">{brushBead.code}</span>
                <button onClick={() => setBrushBead(null)} className="text-amber-500/70 hover:text-red-400 ml-0.5 text-[11px] leading-none">✕</button>
              </div>
            )}
            {editMode && <span className="text-[10px] text-slate-500 hidden sm:inline">{wandMode ? (brushBead || isEraser ? '点击格子直接替换同色区域' : '点击格子选中相同颜色区域') : isEraser ? '擦除格子' : brushBead ? '左键/拖拽填充' : '右键取色 · 左键选格子'}</span>}
            {editMode && <span className="text-[10px] text-slate-500 sm:hidden">{brushBead ? '点击/拖拽填充' : isEraser ? '点击擦除' : '长按格子取色'}</span>}
          </div>
          {selectedBeadHighlight && (
            <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-xl text-indigo-400 text-xs">
              <span className="font-bold">聚焦高亮色号: {selectedBeadHighlight}</span>
              <button onClick={() => setSelectedBeadHighlight(null)} className="hover:text-white font-bold ml-1 font-mono hover:scale-110 cursor-pointer"> × 清除</button>
            </div>
          )}
        </div>

        {/* Palette panel */}
        {editMode && showPalettePanel && (
          <div className="mb-3 p-3 bg-[#0F0F13] border border-white/[0.06] rounded-2xl max-h-[320px] overflow-y-auto">
            {COLOR_GROUPS.map(group => {
              const groupBeads = currentPalette.filter(b => b.series === group.series);
              if (groupBeads.length === 0) return null;
              return (
                <div key={group.series} className="mb-3 last:mb-0">
                  <div className="text-[10px] font-bold text-slate-500 mb-1.5">{group.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {groupBeads.map(b => (
                      <button key={b.code} onClick={() => { setBrushBead(b); setIsEraser(false); }}
                        className="w-7 h-7 rounded-md border border-white/[0.06] hover:scale-125 hover:z-10 transition-all cursor-pointer relative group/bead"
                        style={{ backgroundColor: b.hex }} title={b.code + ' ' + b.name}>
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold opacity-0 group-hover/bead:opacity-100"
                          style={{ color: (hexToRgb(b.hex).r * 0.299 + hexToRgb(b.hex).g * 0.587 + hexToRgb(b.hex).b * 0.114) > 140 ? '#000' : '#fff' }}>
                          {b.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Canvas viewport */}
        <div
          ref={containerRef}
          className="flex-1 w-full overflow-hidden flex items-center justify-center relative border-2 border-dashed border-white/[0.06] rounded-2xl bg-[#09090B] p-4 group min-h-[240px] md:min-h-[380px]"
          style={{ cursor: editMode ? 'crosshair' : 'grab', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={editMode ? handleMouseMoveEdit : handlePanMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            e.preventDefault();
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            const t = e.touches[0];
            const cx = t.clientX, cy = t.clientY;
            if (!editMode) { setPanStart({ x: cx - panOffset.x, y: cy - panOffset.y }); setIsPanning(true); return; }
            longPressPickedRef.current = false;
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              const cell = coordToGrid(cx, cy);
              if (cell) {
                const pixel = transformedPixels[cell.y * gridWidth + cell.x];
                if (pixel && pixel.matchedBead.code !== 'EMPTY') { setBrushBead(pixel.matchedBead); setIsEraser(false); longPressPickedRef.current = true; editDragRef.current = false; }
              }
            }, 500);
            if (wandMode) {
              const cell = coordToGrid(cx, cy);
              if (cell) {
                if (brushBead || isEraser) { touchStartCoordsRef.current = { x: cx, y: cy }; }
                else { setWandSelection(doFloodFill(transformedPixels, cell.x, cell.y, gridWidth, gridHeight)); }
                setSelectedCell(cell);
              }
              return;
            }
            if (brushBead || isEraser) { editFilledRef.current.clear(); touchStartCoordsRef.current = { x: cx, y: cy }; }
            else { setSelectedCell(coordToGrid(cx, cy)); }
          }}
          onTouchMove={(e) => {
            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            const t = e.touches[0];
            if (!editMode) { if (!isPanning) return; setPanOffset({ x: t.clientX - panStart.x, y: t.clientY - panStart.y }); return; }
            if (wandMode || (!brushBead && !isEraser) || longPressPickedRef.current) return;
            if (!editDragRef.current) {
              editDragRef.current = true;
              if (touchStartCoordsRef.current) {
                const sc = coordToGrid(touchStartCoordsRef.current.x, touchStartCoordsRef.current.y);
                if (sc) { const k = `${sc.x},${sc.y}`; if (!editFilledRef.current.has(k)) { editFilledRef.current.add(k); applyBrush(sc.x, sc.y); } }
              }
            }
            const cell = coordToGrid(t.clientX, t.clientY);
            if (!cell) return;
            const key = `${cell.x},${cell.y}`;
            if (editFilledRef.current.has(key)) return;
            editFilledRef.current.add(key);
            applyBrush(cell.x, cell.y);
          }}
          onTouchEnd={() => {
            if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            if (editMode) {
              if ((brushBead || isEraser) && !longPressPickedRef.current && !editDragRef.current && touchStartCoordsRef.current) {
                const cell = coordToGrid(touchStartCoordsRef.current.x, touchStartCoordsRef.current.y);
                if (cell) {
                  if (wandMode) {
                    const sel = doFloodFill(transformedPixels, cell.x, cell.y, gridWidth, gridHeight);
                    pushUndo();
                    applyWandFill(cell, sel, isEraser ? EMPTY_BEAD : brushBead!);
                  } else {
                    applyBrush(cell.x, cell.y);
                  }
                }
              }
              editDragRef.current = false; editFilledRef.current.clear(); touchStartCoordsRef.current = null; longPressPickedRef.current = false;
            } else { setIsPanning(false); }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 rounded-2xl select-none">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-300">图纸高精转换与色卡量化中...</span>
            </div>
          )}
          <div className="relative transition-transform duration-75 origin-center" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
            <canvas ref={canvasRef} className="block shadow-2xl rounded-md border border-white/[0.08]" />
          </div>
        </div>

        <div className="flex justify-center mt-2">
          <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/[0.06] select-none">按住鼠标左键可平移拖拽 · 画布完全支持大尺寸缩放</span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 mt-5 z-10">
          <button onClick={() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })}
            className="py-3.5 px-4 bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 border border-white/[0.05] text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 font-display">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />导出高清拼豆图纸 (PNG)
          </button>
          <button onClick={() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })}
            className="py-3.5 px-4 bg-gradient-to-tr from-indigo-600 via-indigo-650 to-violet-650 hover:brightness-105 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-lg shadow-indigo-950/20 font-display">
            <Award className="w-4 h-4" />导出 A4 打印标准 PDF
          </button>
        </div>
      </div>
  );
}
