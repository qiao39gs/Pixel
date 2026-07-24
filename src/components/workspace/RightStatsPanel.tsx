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
    <div className="absolute right-3 top-14 bottom-3 z-30 flex flex-col w-[88vw] max-w-[400px] glass-panel rounded-3xl overflow-hidden animate-drawer-right">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="font-sans font-semibold text-sm">色卡 / 耗材</span>
        </div>
        <button onClick={toggleRightPanel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5 scrollbar-dark">
        <StatsPanel />
      </div>
    </div>
  );
}