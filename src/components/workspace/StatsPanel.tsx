import React from 'react';
import { Grid3X3 } from 'lucide-react';
import { COLOR_GROUPS } from '../../data/palette';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function StatsPanel() {
  const stats = useWorkspaceStore(s => s.stats);
  const editMode = useWorkspaceStore(s => s.editMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const setSelectedBeadHighlight = useWorkspaceStore(s => s.setSelectedBeadHighlight);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const mobileTab = useWorkspaceStore(s => s.mobileTab);

  return (
    <div className={`bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm ${mobileTab !== 'stats' ? 'hidden lg:block' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3.5 border-b border-slate-100 mb-5 gap-3">
        <div className="flex flex-col">
          <h3 className="font-sans font-semibold text-[#1D1D1F] text-sm flex items-center gap-2 leading-none"><Grid3X3 className="w-4 h-4 text-indigo-500" />MARD 标准色卡</h3>
          <span className="text-xs text-slate-400 font-semibold mt-1 font-mono uppercase tracking-wider">
            材料总用量: <strong className="text-slate-800">{transformedPixels.filter(p => p.matchedBead.code !== 'EMPTY').length} 颗</strong>
          </span>
        </div>
        <div className="text-xs text-slate-400 font-semibold md:text-right">
          {editMode ? '点按色块设为画笔 · 左键画布填充' : '点按下方颜色小块，可快速在上方画布中 '}
          {!editMode && <span className="text-indigo-600">聚焦高亮显示</span>}
        </div>
      </div>
      {COLOR_GROUPS.map(group => {
        const seriesStats = stats.filter(s => s.bead.series === group.series);
        if (seriesStats.length === 0) return null;
        return (
          <div key={group.series} className="mb-5">
            <div className="flex items-center justify-between mb-2.5 px-1"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.name}</span><span className="text-xs text-slate-400 font-mono">{seriesStats.reduce((sum, s) => sum + s.count, 0)} 颗 · {seriesStats.length} 色</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {seriesStats.map(statItem => {
                const isSelected = selectedBeadHighlight === statItem.bead.code;
                return (
                  <div key={statItem.bead.code} onClick={() => editMode ? setBrushBead(statItem.bead) : setSelectedBeadHighlight(isSelected ? null : statItem.bead.code)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' : 'border-slate-100 hover:bg-slate-50 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full shadow-inner border border-black/[0.04] flex items-center justify-center font-mono font-bold text-xs" style={{ backgroundColor: statItem.bead.hex, color: ['#FFFFFF','#F5F5F5','#FFE0B2'].includes(statItem.bead.hex) ? '#334155' : '#FFFFFF' }}>{statItem.bead.code}</div>
                      <div className="flex flex-col"><span className="font-bold text-slate-900 text-xs leading-none">{statItem.bead.name}</span><span className="text-xs text-slate-400 mt-0.5 font-mono">#{statItem.bead.code}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="font-sans font-bold text-slate-800 text-xs tabular-nums">{statItem.count} <span className="text-xs font-normal text-slate-400">颗</span></div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono font-semibold">~{(statItem.count / 1000).toFixed(1)} 包</div>
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
