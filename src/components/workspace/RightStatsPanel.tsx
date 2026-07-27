import React from 'react';
import { X, Layers } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import StatsPanel from './StatsPanel';

export default function RightStatsPanel() {
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);
  const stats = useWorkspaceStore(s => s.stats);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);

  const rightOpen = panelOpen === 'right' || panelOpen === 'both';
  if (!rightOpen) return null;

  return (
    <aside className="editor-side-panel editor-right-panel glass-panel animate-drawer-right">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-2 text-stone-800 min-w-0">
          <span className="flex w-8 h-8 items-center justify-center rounded-xl bg-orange-50 text-[#E8570A] shrink-0"><Layers className="w-4 h-4" /></span>
          <div className="min-w-0">
            <span className="block font-sans font-bold text-sm leading-tight">MARD 色卡</span>
            <span className="block text-[11px] text-stone-500 mt-0.5 font-mono tabular-nums">{transformedPixels.filter(p => p.matchedBead.code !== 'EMPTY').length.toLocaleString()} 颗 · {stats.length} 色</span>
          </div>
        </div>
        <button onClick={toggleRightPanel} className="p-2 -m-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" title="关闭">
          <X className="w-4 h-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-12 scrollbar-dark relative">
        <StatsPanel />
      </div>
      <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-14 bg-gradient-to-t from-[#F8F7F4] via-[#F8F7F4]/70 to-transparent z-10" />
    </aside>
  );
}
