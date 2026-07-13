import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutGrid, Award, Move, Eraser, Sparkles, Wand2, Palette, X, Pencil, Focus } from 'lucide-react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import { COLOR_GROUPS } from '../../data/palette';
import { hexToRgb, luminance } from '../../colorUtils';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { PointerInteraction } from '../../utils/pointerInteraction';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  gridWidth: number;
  gridHeight: number;
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
}

export default function CanvasViewport({ canvasRef, containerRef, gridWidth, gridHeight, currentPalette, onGeneratePng, onGeneratePdf }: Props) {
  const [dragMode, setDragMode] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const editMode = useWorkspaceStore(s => s.editMode);
  const brushBead = useWorkspaceStore(s => s.brushBead);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const wandSelection = useWorkspaceStore(s => s.wandSelection);
  const selectedCell = useWorkspaceStore(s => s.selectedCell);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const isProcessing = useWorkspaceStore(s => s.isProcessing);
  const isPanning = useWorkspaceStore(s => s.isPanning);
  const panOffset = useWorkspaceStore(s => s.panOffset);
  const panStart = useWorkspaceStore(s => s.panStart);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const scale = useWorkspaceStore(s => s.scale);
  const topTrim = useWorkspaceStore(s => s.topTrim);
  const leftTrim = useWorkspaceStore(s => s.leftTrim);
  const rightTrim = useWorkspaceStore(s => s.rightTrim);
  const bottomTrim = useWorkspaceStore(s => s.bottomTrim);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const stats = useWorkspaceStore(s => s.stats);
  const mobileTab = useWorkspaceStore(s => s.mobileTab);

  const setEditMode = useWorkspaceStore(s => s.setEditMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setSelectedCell = useWorkspaceStore(s => s.setSelectedCell);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setWandMode = useWorkspaceStore(s => s.setWandMode);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const setSelectedBeadHighlight = useWorkspaceStore(s => s.setSelectedBeadHighlight);
  const setIsPanning = useWorkspaceStore(s => s.setIsPanning);
  const setPanOffset = useWorkspaceStore(s => s.setPanOffset);
  const setPanStart = useWorkspaceStore(s => s.setPanStart);
  const setScale = useWorkspaceStore(s => s.setScale);
  const applyBrush = useWorkspaceStore(s => s.applyBrush);
  const applyWandFill = useWorkspaceStore(s => s.applyWandFill);
  const pushUndo = useWorkspaceStore(s => s.pushUndo);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const denoise = useWorkspaceStore(s => s.denoise);

  const coordToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const rulerSize = showRulers ? 32 : 0;
    const mx = (clientX - rect.left) * sx - rulerSize;
    const my = (clientY - rect.top) * sy - rulerSize;
    const gx = Math.floor(mx / scale) + leftTrim, gy = Math.floor(my / scale) + topTrim;
    if (gx < leftTrim || gx >= gridWidth - rightTrim || gy < topTrim || gy >= gridHeight - bottomTrim) return null;
    return { x: gx, y: gy };
  }, [canvasRef, showRulers, scale, leftTrim, topTrim, rightTrim, bottomTrim, gridWidth, gridHeight]);

  const interaction = useMemo(() => new PointerInteraction({
    editMode, dragMode, brushBead, isEraser, wandMode,
    transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart,
    coordToGrid,
    setBrushBead, setIsEraser, setSelectedCell, setWandSelection,
    setIsPanning, setPanStart, setPanOffset, setScale,
    applyBrush, applyWandFill, pushUndo,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => {
    interaction.updateCtx({
      editMode, dragMode, brushBead, isEraser, wandMode,
      transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart,
      coordToGrid,
    });
  }, [interaction, editMode, dragMode, brushBead, isEraser, wandMode, transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart, coordToGrid]);

  useEffect(() => () => interaction.destroy(), [interaction]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interaction.onWheel(e, el.getBoundingClientRect());
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, interaction]);

  useEffect(() => { if (!editMode) { setDragMode(false); setToolsOpen(false); } }, [editMode]);
  useEffect(() => { if (mobileTab !== 'canvas') { setDragMode(false); setToolsOpen(false); } }, [mobileTab]);

  const resetView = () => {
    const rulerSize = showRulers ? 32 : 0;
    const maxW = Math.min(window.innerWidth - 24, 700);
    const fit = Math.max(4, Math.floor((maxW - rulerSize) / gridWidth));
    setScale(Math.min(14, fit));
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleDragMode = () => {
    if (!dragMode) { setBrushBead(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); setDragMode(true); }
    else { setDragMode(false); }
  };

  return (
    <div className={`bg-slate-950 border border-[#1D1D21] rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden min-h-[calc(100dvh-130px)] md:min-h-[500px] transition-all ${mobileTab !== 'canvas' ? 'hidden lg:block' : ''}`}>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-white/[0.04] z-10">
        <div className="flex items-center gap-2 text-white"><span className="text-xs font-bold px-2.5 py-1 bg-white/[0.06] border border-white/[0.04] rounded-lg text-slate-300 font-mono">{gridWidth} × {gridHeight} 画幅规格</span><span className="text-xs text-slate-400 font-semibold">( 最终已精准出数: <strong className="text-indigo-400">{stats.length} 色</strong> )</span></div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setEditMode(!editMode); setBrushBead(null); setSelectedCell(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); }} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${editMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'}`}>{editMode ? ' 编辑中' : ' 手动编辑'}</button>
           {editMode && <button onClick={undo} className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]" title="撤销 (Ctrl+Z)">撤销</button>}
           {editMode && <button onClick={redo} className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]" title="重做 (Ctrl+Shift+Z)">重做</button>}
          {editMode && <>
            {/* Desktop: show all */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button onClick={() => { setIsEraser(!isEraser); setBrushBead(null); }} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${isEraser ? 'bg-red-500 text-white border-red-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]'}`}>橡皮擦</button>
              <button onClick={() => denoise(gridWidth, gridHeight, currentPalette)} className="px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30">去杂色</button>
              <button onClick={() => { setWandMode(!wandMode); setWandSelection(new Set()); setIsEraser(false); }} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${wandMode ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/30'}`}>魔棒</button>
              <button onClick={() => setShowPalettePanel(!showPalettePanel)} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${showPalettePanel ? 'bg-violet-500 text-white border-violet-500' : 'bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30'}`}>色板</button>
            </div>
           </>}
           {editMode && wandMode && wandSelection.size > 0 && <span className="text-xs text-cyan-400 font-mono">已选{wandSelection.size}格</span>}
          {editMode && brushBead && <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg"><div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brushBead.hex }} /><span className="text-xs font-bold text-amber-400">{brushBead.code}</span><button onClick={() => setBrushBead(null)} className="text-amber-500/70 hover:text-red-400 ml-0.5 text-xs leading-none">✕</button></div>}
          {editMode && <span className="text-xs text-slate-500 hidden sm:inline">{wandMode ? (brushBead || isEraser ? '点击格子直接替换同色区域' : '点击格子选中相同颜色区域') : isEraser ? '擦除格子' : brushBead ? '左键/拖拽填充' : '右键取色 · 左键选格子'}</span>}
          {editMode && <span className="text-xs text-slate-500 sm:hidden">{dragMode ? '拖拽平移画布 · 双指缩放' : brushBead ? '点击/拖拽填充' : isEraser ? '点击擦除' : '长按格子取色'}</span>}
        </div>
        {selectedBeadHighlight && <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-xl text-indigo-400 text-xs"><span className="font-bold">聚焦高亮色号: {selectedBeadHighlight}</span><button onClick={() => setSelectedBeadHighlight(null)} className="hover:text-white font-bold ml-1 font-mono hover:scale-110 cursor-pointer"> × 清除</button></div>}
      </div>

      {editMode && showPalettePanel && (
        <div className="mb-3 p-3 bg-[#0F0F13] border border-white/[0.06] rounded-2xl max-h-[320px] overflow-y-auto">
          {COLOR_GROUPS.map(group => { const groupBeads = currentPalette.filter(b => b.series === group.series); if (groupBeads.length === 0) return null; return (
            <div key={group.series} className="mb-3 last:mb-0"><div className="text-xs font-bold text-slate-500 mb-1.5">{group.name}</div><div className="flex flex-wrap gap-1">
              {groupBeads.map(b => (<button key={b.code} onClick={() => { setBrushBead(b); setIsEraser(false); }} className="w-9 h-9 rounded-md border border-white/[0.06] hover:scale-125 hover:z-10 transition-all cursor-pointer relative group/bead" style={{ backgroundColor: b.hex }} title={b.code + ' ' + b.name}><span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover/bead:opacity-100" style={{ color: luminance(hexToRgb(b.hex)) > 140 ? '#000' : '#fff' }}>{b.code}</span></button>))}
            </div></div>);})}
        </div>
      )}

      <div ref={containerRef} className="flex-1 w-full overflow-hidden flex items-center justify-center relative border-2 border-dashed border-white/[0.06] rounded-2xl bg-[#09090B] p-4 group min-h-[320px] md:min-h-[380px]" style={{ cursor: (editMode && !dragMode) ? 'crosshair' : 'grab', touchAction: 'none' }}
        onMouseDown={(e) => interaction.onMouseDown(e)}
        onMouseMove={(e) => interaction.onMouseMove(e)}
        onMouseUp={() => interaction.onMouseUp()}
        onMouseLeave={() => interaction.onMouseUp()}
        onTouchStart={(e) => interaction.onTouchStart(e)}
        onTouchMove={(e) => interaction.onTouchMove(e)}
        onTouchEnd={() => interaction.onTouchEnd()}
        onContextMenu={(e) => e.preventDefault()}>
        {isProcessing && <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 rounded-2xl select-none"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><span className="text-xs font-bold text-slate-300">图纸高精转换与色卡量化中...</span></div>}
        <div className="relative transition-transform duration-75 origin-center" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}><canvas ref={canvasRef} className="block shadow-2xl rounded-md border border-white/[0.08]" /></div>
        <button onClick={resetView} className="absolute top-2 right-2 z-20 p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/20 transition-all" title="还原视图" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}><Focus className="w-4 h-4" /></button>
        {editMode && <div className="sm:hidden absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>{toolsOpen && <div className="flex flex-col items-end gap-1.5 mb-1"><button onClick={() => { toggleDragMode(); setToolsOpen(false); }} className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full shadow-lg transition-all ${dragMode ? 'bg-amber-500 text-white' : 'bg-white/15 text-slate-200'}`} title="拖拽模式"><span className="text-xs font-bold">拖拽</span><Move className="w-4 h-4" /></button><button onClick={() => { setIsEraser(!isEraser); setBrushBead(null); setDragMode(false); setToolsOpen(false); }} className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full shadow-lg transition-all ${isEraser ? 'bg-red-500 text-white' : 'bg-white/15 text-slate-200'}`} title="橡皮擦"><span className="text-xs font-bold">橡皮</span><Eraser className="w-4 h-4" /></button><button onClick={() => { denoise(gridWidth, gridHeight, currentPalette); setToolsOpen(false); }} className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full bg-white/15 text-slate-200 shadow-lg transition-all hover:bg-emerald-500/20 hover:text-emerald-400" title="去杂色"><span className="text-xs font-bold">去杂</span><Sparkles className="w-4 h-4" /></button><button onClick={() => { setWandMode(!wandMode); setWandSelection(new Set()); setIsEraser(false); setDragMode(false); setToolsOpen(false); }} className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full shadow-lg transition-all ${wandMode ? 'bg-cyan-500 text-white' : 'bg-white/15 text-slate-200'}`} title="魔棒"><span className="text-xs font-bold">魔棒</span><Wand2 className="w-4 h-4" /></button><button onClick={() => { setShowPalettePanel(!showPalettePanel); setDragMode(false); setToolsOpen(false); }} className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full shadow-lg transition-all ${showPalettePanel ? 'bg-violet-500 text-white' : 'bg-white/15 text-slate-200'}`} title="色板"><span className="text-xs font-bold">色板</span><Palette className="w-4 h-4" /></button></div>}<button onClick={() => setToolsOpen(!toolsOpen)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm text-white shadow-lg transition-all hover:bg-white/25">{toolsOpen ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}</button></div>}
      </div>
      <div className="flex justify-center mt-2"><span className="text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/[0.06] select-none hidden md:inline">{editMode ? '滚轮缩放 · 左键拖拽平移 · 右键取色 · 画笔点击或拖拽填充' : '滚轮缩放 · 按住鼠标左键可平移拖拽 · 画布完全支持大尺寸缩放'}</span><span className="text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/[0.06] select-none md:hidden">{editMode ? (dragMode ? '单指拖拽平移 · 双指缩放 · 点击还原视图复位' : '双指缩放 · 长按取色 · 点击右下工具栏切换编辑工具') : '单指拖拽平移 · 双指缩放 · 点击右上角还原视图'}</span></div>
      <div className="grid grid-cols-2 gap-3.5 mt-5 z-10">
        <button onClick={() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })} className="py-2.5 px-4 bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 border border-white/[0.05] text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"><LayoutGrid className="w-4 h-4 text-emerald-400" />导出图片</button>
        <button onClick={() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })} className="py-2.5 px-4 bg-gradient-to-tr from-indigo-600 via-indigo-650 to-violet-650 hover:brightness-105 active:scale-98 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-lg shadow-indigo-950/20"><Award className="w-4 h-4" />导出 PDF</button>
      </div>
    </div>
  );
}
