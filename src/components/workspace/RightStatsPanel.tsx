import React from 'react';
import { Layers } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import StatsPanel from './StatsPanel';
import PanelHeader from './PanelHeader';

export default function RightStatsPanel() {
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);
  const stats = useWorkspaceStore(s => s.stats);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);

  const rightOpen = panelOpen === 'right' || panelOpen === 'both';
  if (!rightOpen) return null;

  return (
    <aside className="editor-side-panel editor-right-panel glass-panel animate-drawer-right">
      <PanelHeader icon={<Layers className="h-4 w-4" />} title="耗材统计" description={<span className="font-mono tabular-nums">{transformedPixels.filter(p => p.matchedBead.code !== 'EMPTY').length.toLocaleString()} 颗 · {stats.length} 色</span>} onClose={toggleRightPanel} closeLabel="关闭耗材统计" />
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-12 scrollbar-dark relative">
        <StatsPanel />
      </div>
      <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-14 bg-gradient-to-t from-[#F8F7F4] via-[#F8F7F4]/70 to-transparent z-10" />
    </aside>
  );
}
