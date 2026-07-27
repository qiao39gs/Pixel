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
    <aside className="editor-side-panel editor-left-panel glass-panel animate-drawer-left">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-2 text-stone-800">
          <span className="flex w-8 h-8 items-center justify-center rounded-xl bg-orange-50 text-[#E8570A]"><Sliders className="w-4 h-4" /></span>
          <div><span className="block font-sans font-bold text-sm leading-tight">图纸参数</span><span className="block text-[11px] text-stone-500 mt-0.5">规格、颜色与视图</span></div>
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
            className={`h-8 px-3 text-[13px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${leftDrawerTab === t.id ? 'bg-[#E8570A] text-white shadow-sm' : 'text-stone-500 hover:bg-stone-100'}`}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
        {leftDrawerTab === 'spec' && <SpecSection />}
        {leftDrawerTab === 'adjust' && <AdjustSection />}
        {leftDrawerTab === 'ai' && <AiSection onTriggerEnhance={onTriggerEnhance} />}
        {leftDrawerTab === 'trim' && <TrimSection />}
        {leftDrawerTab === 'view' && <ViewSection />}
      </div>
    </aside>
  );
}
