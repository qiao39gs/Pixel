import React from 'react';
import { ZoomIn, ZoomOut, Focus, Maximize } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { MIN_SCALE, MAX_SCALE } from '../../utils/constants';

export default function ZoomControls() {
  const scale = useWorkspaceStore(s => s.scale);
  const setScale = useWorkspaceStore(s => s.setScale);
  const editMode = useWorkspaceStore(s => s.editMode);
  const zoomPct = Math.round((scale / 14) * 100);

  return (
    <div className={`zoom-controls absolute z-20 flex items-center gap-0.5 glass-toolbar rounded-xl px-1 py-1 animate-toolbar-pop right-3 bottom-3 transition-[bottom] duration-200 ${editMode ? 'max-sm:bottom-[72px]' : ''}`} title="滚轮缩放 · Ctrl/Cmd + 滚轮">
      <button onClick={() => setScale(Math.max(MIN_SCALE, scale - 2))} title="缩小" className="p-2 rounded-lg text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
      <span className="px-2 text-[13px] font-mono font-bold text-slate-200 select-none w-14 text-center">{zoomPct}%</span>
      <button onClick={() => setScale(Math.min(MAX_SCALE, scale + 2))} title="放大" className="p-2 rounded-lg text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
      <span className="w-px h-5 bg-white/10 mx-0.5" />
      <button onClick={() => window.dispatchEvent(new CustomEvent('pixel:reset-view'))} title="适应画布" className="p-2 rounded-lg text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"><Maximize className="w-4 h-4" /></button>
      <button onClick={() => setScale(14)} title="实际大小 (100%)" className="p-2 rounded-lg text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"><Focus className="w-4 h-4" /></button>
    </div>
  );
}
