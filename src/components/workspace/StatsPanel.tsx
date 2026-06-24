import React, { useState, useMemo } from 'react';
import { Grid3X3, X, ArrowLeftRight } from 'lucide-react';
import { BeadPaletteItem } from '../../types';
import { hexToRgb } from '../../colorUtils';
import { BEAD_PALETTE, COLOR_GROUPS } from '../../data/palette';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function StatsPanel() {
  const stats = useWorkspaceStore(s => s.stats);
  const editMode = useWorkspaceStore(s => s.editMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const setSelectedBeadHighlight = useWorkspaceStore(s => s.setSelectedBeadHighlight);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const mobileTab = useWorkspaceStore(s => s.mobileTab);
  const swapColor = useWorkspaceStore(s => s.swapColor);

  const [swapSource, setSwapSource] = useState<string | null>(null);

  const allPalette = useMemo(() => {
    const seen = new Set<string>();
    return BEAD_PALETTE.filter(b => b.brand === 'MGB' && !seen.has(b.code) && seen.add(b.code));
  }, []);

  const usedCounts = useMemo(() => {
    const m = new Map<string, number>();
    stats.forEach(s => m.set(s.bead.code, s.count));
    return m;
  }, [stats]);

  return (
    <div className={`bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm ${mobileTab === 'canvas' ? 'hidden lg:block' : ''}`}>
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
                {stats.map(s => {
                  const b = s.bead;
                  const isCurrent = b.code === swapSource;
                  return (
                    <button key={b.code}
                      onClick={() => { swapColor(swapSource, b); setSwapSource(null); }}
                      disabled={isCurrent}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer relative ${isCurrent ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:shadow-sm active:scale-95'}`}
                    >
                      <div className="w-full aspect-square rounded-lg border border-black/[0.06]" style={{ backgroundColor: b.hex }} />
                      <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-amber-700' : 'text-slate-800'}`}>{b.code}</span>
                      {!isCurrent && <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-amber-500 text-white text-[8px] font-bold leading-tight">{s.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Empty option */}
            <div id="swap-group-empty" className="mb-3 pb-3 border-b border-zinc-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">空白格</span>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                <button
                  onClick={() => { swapColor(swapSource, { code: 'EMPTY', name: '透明背景', hex: 'rgba(0,0,0,0)', brand: 'MGB', series: '' }); setSwapSource(null); }}
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
                      const luma = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3.5 border-b border-slate-100 mb-5 gap-3">
        <div className="flex flex-col">
          <h3 className="font-sans font-semibold text-[#1D1D1F] text-sm flex items-center gap-2 leading-none"><Grid3X3 className="w-4 h-4 text-indigo-500" />MARD 标准色卡</h3>
          <span className="text-xs text-slate-400 font-semibold mt-1 font-mono uppercase tracking-wider">
            材料总用量: <strong className="text-slate-800">{transformedPixels.filter(p => p.matchedBead.code !== 'EMPTY').length} 颗</strong>
          </span>
        </div>
        <div className="text-xs text-slate-400 font-semibold md:text-right">
          {editMode ? '点按色块设为画笔 · 左键画布填充' : '点击色块聚焦高亮 · 点击换色替换色号'}
        </div>
      </div>
      {COLOR_GROUPS.map(group => {
        const seriesStats = stats.filter(s => s.bead.series === group.series);
        if (seriesStats.length === 0) return null;
        return (
          <div key={group.series} className="mb-5">
            <div className="flex items-center justify-between mb-2.5 px-1"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group.name}</span><span className="text-xs text-slate-400 font-mono">{seriesStats.reduce((sum, s) => sum + s.count, 0)} 颗 · {seriesStats.length} 色</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {seriesStats.map(statItem => {
                const isSelected = selectedBeadHighlight === statItem.bead.code;
                return (
                  <div key={statItem.bead.code}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' : 'border-slate-100 hover:bg-slate-50 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); editMode ? setBrushBead(statItem.bead) : setSelectedBeadHighlight(isSelected ? null : statItem.bead.code); }}
                        className="w-10 h-10 rounded-full shadow-inner border border-black/[0.04] flex items-center justify-center font-mono font-bold text-xs transition-transform hover:scale-110 cursor-pointer flex-shrink-0"
                        style={{ backgroundColor: statItem.bead.hex, color: ['#FFFFFF','#F5F5F5','#FFE0B2'].includes(statItem.bead.hex) ? '#334155' : '#FFFFFF' }}
                        title={editMode ? '设为画笔' : (isSelected ? '取消高亮' : '聚焦高亮')}
                      >
                        {statItem.bead.code}
                      </button>
                      <div className="flex flex-col"><span className="font-bold text-slate-900 text-xs leading-none">{statItem.bead.name}</span><span className="text-xs text-slate-400 mt-0.5 font-mono">#{statItem.bead.code}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-sans font-bold text-slate-800 text-xs tabular-nums">{statItem.count} <span className="text-xs font-normal text-slate-400">颗</span></div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono font-semibold">~{(statItem.count / 1000).toFixed(1)} 包</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSwapSource(statItem.bead.code); }}
                        className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer flex-shrink-0"
                      >换色</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
