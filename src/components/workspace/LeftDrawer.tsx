import React from 'react';
import { X, Sliders } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { SpecSection, AdjustSection, AiSection, TrimSection, ViewSection } from './ControlSections';

const TABS = [
  { id: 'spec', label: '规格' },
  { id: 'adjust', label: '调整' },
  { id: 'ai', label: 'AI' },
  { id: 'trim', label: '裁剪' },
  { id: 'view', label: '视图' },
] as const;

export default function LeftDrawer({ onTriggerEnhance }: { onTriggerEnhance: () => void }) {
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const leftDrawerTab = useWorkspaceStore(s => s.leftDrawerTab);
  const setLeftDrawerTab = useWorkspaceStore(s => s.setLeftDrawerTab);
  const toggleLeftDrawer = useWorkspaceStore(s => s.toggleLeftDrawer);

  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  if (!leftOpen) return null;

  return (
    <div className="absolute left-3 top-16 bottom-3 z-30 flex flex-col w-[88vw] max-w-[360px] glass-panel rounded-2xl overflow-hidden animate-drawer-left">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-2 text-slate-800">
          <Sliders className="w-4 h-4 text-slate-400" />
          <span className="font-sans font-bold text-sm">参数面板</span>
        </div>
        <button onClick={toggleLeftDrawer} className="p-2 -m-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" title="关闭">
            <X className="w-4 h-4" />
        </button>
      </header>
      <div className="flex gap-1 px-3 py-2.5 border-b border-slate-200/40 shrink-0 overflow-x-auto scrollbar-dark">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setLeftDrawerTab(t.id)}
            className={`h-8 px-3 text-[13px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${leftDrawerTab === t.id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5 scrollbar-dark">
        {leftDrawerTab === 'spec' && <SpecSection />}
        {leftDrawerTab === 'adjust' && <AdjustSection />}
        {leftDrawerTab === 'ai' && <AiSection onTriggerEnhance={onTriggerEnhance} />}
        {leftDrawerTab === 'trim' && <TrimSection />}
        {leftDrawerTab === 'view' && <ViewSection />}
      </div>
    </div>
  );
}