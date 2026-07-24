import React from 'react';
import { X, Layers } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import StatsPanel from './StatsPanel';

export default function RightStatsPanel() {
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);

  const rightOpen = panelOpen === 'right' || panelOpen === 'both';
  if (!rightOpen) return null;

  return (
    <div className="absolute right-3 top-16 bottom-3 z-30 flex flex-col w-[88vw] max-w-[340px] glass-panel rounded-2xl overflow-hidden animate-drawer-right">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-2 text-slate-800">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-sans font-bold text-sm">色卡 / 耗材</span>
        </div>
        <button onClick={toggleRightPanel} className="p-2 -m-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" title="关闭">
          <X className="w-4 h-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5 pb-10 scrollbar-dark relative">
        <StatsPanel />
      </div>
      <div className="pointer-events-none absolute left-0 right-0 bottom-10 h-10 bg-gradient-to-t from-[#F8FAFC] to-transparent z-10" />
    </div>
  );
}