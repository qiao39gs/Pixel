import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeftRight, ChevronDown, HelpCircle } from 'lucide-react';
import { BeadPaletteItem } from '../../types';
import { hexToRgb, luminance, rgbToLab, deltaE2000 } from '../../colorUtils';
import { BEAD_PALETTE, COLOR_GROUPS } from '../../data/palette';
import { EMPTY_BEAD } from '../../utils/editOperations';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function StatsPanel() {
  const stats = useWorkspaceStore(s => s.stats);
  const editMode = useWorkspaceStore(s => s.editMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const setSelectedBeadHighlight = useWorkspaceStore(s => s.setSelectedBeadHighlight);
  const setHoverBeadHighlight = useWorkspaceStore(s => s.setHoverBeadHighlight);
  const swapColor = useWorkspaceStore(s => s.swapColor);
  const collapsedGroups = useWorkspaceStore(s => s.collapsedGroups);
  const toggleGroupCollapse = useWorkspaceStore(s => s.toggleGroupCollapse);

  const [swapSource, setSwapSource] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const allPalette = useMemo(() => {
    const seen = new Set<string>();
    return BEAD_PALETTE.filter(b => b.brand === 'MGB' && !seen.has(b.code) && seen.add(b.code));
  }, []);

  const usedCounts = useMemo(() => {
    const m = new Map<string, number>();
    stats.forEach(s => m.set(s.bead.code, s.count));
    return m;
  }, [stats]);

  const [dragSource, setDragSource] = useState<string | null>(null);

  // Precompute Lab values for all displayed colors (for similarity calculation)
  const labCache = useMemo(() => {
    const m = new Map<string, ReturnType<typeof rgbToLab>>();
    stats.forEach(s => {
      if (!m.has(s.bead.code)) m.set(s.bead.code, rgbToLab(hexToRgb(s.bead.hex)));
    });
    return m;
  }, [stats]);

  // When dragging, compute similarity percentage to the dragged color
  const similarityMap = useMemo(() => {
    if (!dragSource) return null;
    const sourceLab = labCache.get(dragSource);
    if (!sourceLab) return null;
    const m = new Map<string, number>();
    labCache.forEach((lab, code) => {
      if (code === dragSource) return;
      const de = deltaE2000(sourceLab, lab);
      m.set(code, Math.max(0, Math.round(100 - de)));
    });
    return m;
  }, [dragSource, labCache]);

  // When swapping, compute similarity to the source color
  const swapSimilarityMap = useMemo(() => {
    if (!swapSource) return null;
    const sourceLab = labCache.get(swapSource);
    if (!sourceLab) return null;
    const m = new Map<string, number>();
    labCache.forEach((lab, code) => {
      if (code === swapSource) return;
      const de = deltaE2000(sourceLab, lab);
      m.set(code, Math.max(0, Math.round(100 - de)));
    });
    return m;
  }, [swapSource, labCache]);

  // 移动端长按拖拽换色：HTML5 DnD 在触屏不触发，改用长按+原生非被动触摸事件
  const beadByCode = useMemo(() => new Map(stats.map(s => [s.bead.code, s.bead])), [stats]);
  const beadByCodeRef = useRef(beadByCode);
  beadByCodeRef.current = beadByCode;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ code: string; x: number; y: number } | null>(null);
  const dragActiveRef = useRef(false);
  const suppressClickRef = useRef(false);
  const nativeHandlersRef = useRef<{ move: (e: TouchEvent) => void; end: (e: TouchEvent) => void } | null>(null);

  const findColorCodeAt = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const item = el.closest('[data-color-code]') as HTMLElement | null;
    return item?.dataset.colorCode ?? null;
  }, []);

  const startTouchDrag = useCallback((sourceCode: string) => {
    dragActiveRef.current = true;
    setDragSource(sourceCode);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* ignore */ }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      const code = findColorCodeAt(t.clientX, t.clientY);
      setDragOver(code && code !== sourceCode ? code : null);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const code = findColorCodeAt(t.clientX, t.clientY);
      if (code && code !== sourceCode) {
        const targetBead = beadByCodeRef.current.get(code);
        if (targetBead) swapColor(sourceCode, targetBead);
      }
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      nativeHandlersRef.current = null;
      dragActiveRef.current = false;
      setDragSource(null);
      setDragOver(null);
      suppressClickRef.current = true;
    };
    nativeHandlersRef.current = { move: onTouchMove, end: onTouchEnd };
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  }, [findColorCodeAt, swapColor]);

  useEffect(() => () => {
    if (nativeHandlersRef.current) {
      document.removeEventListener('touchmove', nativeHandlersRef.current.move, true);
      document.removeEventListener('touchend', nativeHandlersRef.current.end, true);
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  const onItemTouchStart = (code: string) => (e: React.TouchEvent) => {
    suppressClickRef.current = false;
    const t = e.touches[0];
    touchStartRef.current = { code, x: t.clientX, y: t.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      if (!dragActiveRef.current) startTouchDrag(code);
    }, 350);
  };
  const onItemTouchMove = (e: React.TouchEvent) => {
    if (dragActiveRef.current) return;
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (dx * dx + dy * dy > 100) { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }
  };
  const onItemTouchEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  return (
    <div className="flex flex-col">
      {/* Swap palette popup */}
      {swapSource && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-xs" onClick={() => setSwapSource(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-zinc-200 p-5 max-w-md w-full sm:mx-4 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 mb-3">
              <div className="flex items-center gap-2.5">
                {(() => { const srcBead = allPalette.find(b => b.code === swapSource); const swatchBg = srcBead?.hex; const rgb = swatchBg ? hexToRgb(swatchBg) : null; return (
                  <div className="w-8 h-8 rounded-lg border-2 border-zinc-300 flex-shrink-0" style={{ backgroundColor: swatchBg }} />
                ); })()}
                <span className="font-mono font-bold text-sm text-slate-800">{swapSource}</span>
              </div>
              <ArrowLeftRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">选择目标色</span>
              <button onClick={() => setSwapSource(null)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer flex-shrink-0"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {/* Quick nav pills */}
            <div className="grid grid-cols-5 gap-1 mb-3 pb-3 border-b border-zinc-100">
              <button onClick={() => document.getElementById('swap-group-used')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-1.5 py-1 text-[10px] font-bold rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer text-center">已有</button>
              <button onClick={() => document.getElementById('swap-group-empty')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-1.5 py-1 text-[10px] font-bold rounded-md border border-zinc-200 text-slate-500 hover:bg-zinc-50 cursor-pointer text-center">空</button>
              {COLOR_GROUPS.filter(g => allPalette.some(b => b.series === g.series)).map(g => (
                <button key={g.series} onClick={() => document.getElementById(`swap-group-${g.series}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-1.5 py-1 text-[10px] font-bold rounded-md border border-zinc-200 text-slate-500 hover:bg-zinc-50 cursor-pointer text-center">{g.series}</button>
              ))}
            </div>
            {/* Used colors group */}
            <div id="swap-group-used" className="mb-3 pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 block">已有的色彩 ({stats.length} 色)</span>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {(() => { const totalUsed = stats.reduce((s, x) => s + x.count, 0); return stats.map(s => {
                  const b = s.bead;
                  const pct = Math.round(s.count / totalUsed * 100);
                  const isCurrent = b.code === swapSource;
                  return (
                    <button key={b.code}
                      onClick={() => { swapColor(swapSource, b); setSwapSource(null); }}
                      disabled={isCurrent}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer relative ${isCurrent ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:shadow-sm active:scale-95'}`}
                    >
                      <div className="relative w-full aspect-square rounded-lg border border-black/[0.06] overflow-hidden" style={{ backgroundColor: b.hex }}>
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              background: `conic-gradient(rgba(0,0,0,0.3) ${pct}%, transparent ${pct}%)`,
                              maskImage: 'radial-gradient(transparent 55%, black 58%)',
                              WebkitMaskImage: 'radial-gradient(transparent 55%, black 58%)',
                            }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-amber-700' : 'text-slate-800'}`}>{b.code}</span>
                      <span className={`text-[9px] font-mono font-bold ${isCurrent ? 'text-amber-600' : 'text-slate-400'}`}>{pct}%</span>
                      {!isCurrent && swapSimilarityMap && (() => {
                        const sim = swapSimilarityMap.get(b.code);
                        if (sim === undefined) return null;
                        const colorCls = sim >= 90 ? 'text-emerald-600' : sim >= 70 ? 'text-amber-600' : 'text-slate-400';
                        return <span className={`text-[9px] font-mono font-bold ${colorCls}`}>{sim}% 相似</span>;
                      })()}
                    </button>
                  );
                }); })()}
              </div>
            </div>
            {/* Empty option */}
            <div id="swap-group-empty" className="mb-3 pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">空白格</span>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                <button
                  onClick={() => { swapColor(swapSource, EMPTY_BEAD); setSwapSource(null); }}
                  disabled={swapSource === 'EMPTY'}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${swapSource === 'EMPTY' ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm active:scale-95'}`}
                >
                  <div className="w-full aspect-square rounded-lg border-2 border-dashed border-zinc-300 bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)_50%/8px_8px]" />
                  <span className={`text-xs font-mono font-bold ${swapSource === 'EMPTY' ? 'text-amber-700' : 'text-slate-500'}`}>空</span>
                </button>
              </div>
            </div>
            {COLOR_GROUPS.map(group => {
              const groupBeads = allPalette.filter(b => b.series === group.series);
              if (groupBeads.length === 0) return null;
              return (
                <div key={group.series} id={`swap-group-${group.series}`} className="mb-3 last:mb-0">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{group.name}</div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {groupBeads.map(b => {
                      const isCurrent = b.code === swapSource;
                      const used = usedCounts.get(b.code);
                      const rgb = hexToRgb(b.hex);
                      const luma = luminance(rgb);
                      return (
                        <button
                          key={b.code}
                          onClick={() => { swapColor(swapSource, b); setSwapSource(null); }}
                          disabled={isCurrent}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer relative ${isCurrent ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : used ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 opacity-60 hover:opacity-100 hover:border-zinc-300 hover:shadow-sm active:scale-95'}`}
                        >
                          <div className="w-full aspect-square rounded-lg border border-black/[0.06]" style={{ backgroundColor: b.hex }} />
                          <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-amber-700' : luma > 140 ? 'text-slate-800' : 'text-slate-500'}`}>{b.code}</span>
                          {used && !isCurrent && <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-indigo-500 text-white text-[8px] font-bold leading-tight">{used}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/70">
        <span className="text-[12px] text-stone-500">{editMode ? '点击色块设为画笔' : '点击聚焦 · 拖拽换色'}</span>
        <div className="group relative shrink-0">
          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer" title="操作说明">
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-20 w-max max-w-[220px] p-2.5 rounded-lg bg-slate-800 text-slate-100 text-[12px] leading-relaxed shadow-lg pointer-events-none">
            {editMode ? '点击色块设为画笔 · 左键画布填充' : '点击色块聚焦高亮 · 拖拽至另一色块换色'}
          </div>
        </div>
      </div>
      {COLOR_GROUPS.map(group => {
        const seriesStats = stats.filter(s => s.bead.series === group.series);
        if (seriesStats.length === 0) return null;
        const seriesCount = seriesStats.reduce((sum, s) => sum + s.count, 0);
        return (
<div key={group.series} className="mb-4">
          <div className="flex items-center h-8 mb-1.5 cursor-pointer select-none hover:bg-slate-50/60 rounded-md transition-colors -mx-1 px-1" onClick={() => toggleGroupCollapse(group.series)}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${collapsedGroups.has(group.series) ? '-rotate-90' : ''}`} />
              <span className="text-[13px] font-bold text-slate-600 truncate">{group.name}</span>
            </div>
            <div className="flex items-baseline gap-1 shrink-0">
              <strong className="text-[13px] text-slate-700 font-mono tabular-nums font-semibold">{seriesCount.toLocaleString()}</strong>
              <span className="text-[11px] text-slate-400">颗</span>
              <span className="text-[12px] text-slate-400 mx-0.5">·</span>
              <span className="text-[12px] text-slate-400">{seriesStats.length} 色</span>
            </div>
          </div>
          {!collapsedGroups.has(group.series) && (
          <div className="flex flex-col">
            {seriesStats.map((statItem, idx) => {
              const isSelected = selectedBeadHighlight === statItem.bead.code;
              const luma = luminance(hexToRgb(statItem.bead.hex));
              return (
                <div key={statItem.bead.code}
                  data-color-code={statItem.bead.code}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', statItem.bead.code); e.dataTransfer.effectAllowed = 'move'; setDragSource(statItem.bead.code); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(statItem.bead.code); }}
                  onDragLeave={() => setDragOver(null)}
                  onDragEnd={() => { setDragSource(null); setDragOver(null); }}
                  onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData('text/plain'); if (src && src !== statItem.bead.code) swapColor(src, statItem.bead); setDragSource(null); setDragOver(null); }}
                  onTouchStart={onItemTouchStart(statItem.bead.code)}
                  onTouchMove={onItemTouchMove}
                  onTouchEnd={onItemTouchEnd}
                  onMouseEnter={() => { if (!editMode) setHoverBeadHighlight(statItem.bead.code); }}
                  onMouseLeave={() => { if (!editMode) setHoverBeadHighlight(null); }}
                  className={`group flex items-center gap-2.5 px-2 py-2 transition-all cursor-pointer select-none relative rounded-lg ${idx !== 0 ? 'border-t border-stone-100' : ''} ${dragSource === statItem.bead.code ? 'bg-orange-50/60' : dragOver === statItem.bead.code ? 'bg-orange-50 ring-1 ring-orange-300' : isSelected ? 'bg-orange-50 before:content-[""] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-[#E8570A]' : 'hover:bg-stone-100/70'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (suppressClickRef.current) { suppressClickRef.current = false; return; } editMode ? setBrushBead(statItem.bead) : setSelectedBeadHighlight(isSelected ? null : statItem.bead.code); }}
                    className="w-9 h-9 rounded-full border border-black/[0.08] flex items-center justify-center font-mono font-medium text-[10px] flex-shrink-0"
                    style={{ backgroundColor: statItem.bead.hex, color: luma > 140 ? '#475569' : '#FFFFFF' }}
                    title={editMode ? '设为画笔' : (isSelected ? '取消高亮' : '聚焦高亮')}
                  >
                    {statItem.bead.code}
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
                    <span className="font-semibold text-slate-800 text-[13px] truncate" title={statItem.bead.name}>{statItem.bead.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">#{statItem.bead.code}</span>
                  </div>
                  {similarityMap && dragSource !== statItem.bead.code && (() => {
                    const sim = similarityMap.get(statItem.bead.code);
                    if (sim === undefined) return null;
                    const colorCls = sim >= 90 ? 'text-emerald-600' : sim >= 70 ? 'text-amber-600' : 'text-slate-400';
                    return <span className={`text-[11px] font-mono font-bold ${colorCls} shrink-0`} title="相似度">{sim}%</span>;
                  })()}
                  {dragSource === statItem.bead.code && (
                    <span className="text-[11px] font-mono font-bold text-amber-500 shrink-0">拖拽中</span>
                  )}
                  <div className="flex items-baseline gap-0.5 shrink-0">
                    <strong className="text-[14px] font-mono font-semibold text-slate-700 tabular-nums">{statItem.count}</strong>
                    <span className="text-[11px] text-slate-400">颗</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (suppressClickRef.current) { suppressClickRef.current = false; return; } setSwapSource(statItem.bead.code); }}
                    className="p-1.5 -mr-1 rounded-md text-stone-400 hover:text-[#E8570A] hover:bg-orange-50 transition-all cursor-pointer flex-shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    title="换色"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
</div>
              );
            })}
          </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
