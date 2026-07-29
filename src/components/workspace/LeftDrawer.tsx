import React from 'react';
import { Sliders } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { SpecSection, AdjustSection, AiSection, TrimSection, ViewSection } from './ControlSections';
import PanelHeader from './PanelHeader';

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
  const pipelineMode = useWorkspaceStore(s => s.pipelineMode);

  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  if (!leftOpen) return null;

  const hasSourceImage = pipelineMode !== 'skipAndHold';
  const visibleTabs = hasSourceImage ? TABS : TABS.filter(tab => tab.id === 'trim' || tab.id === 'view');
  const activeTab = visibleTabs.some(tab => tab.id === leftDrawerTab) ? leftDrawerTab : 'trim';

  return (
    <aside className="editor-side-panel editor-left-panel glass-panel animate-drawer-left">
      <PanelHeader icon={<Sliders className="h-4 w-4" />} title="图纸参数" description={hasSourceImage ? '规格、颜色与视图' : '裁剪与视图'} onClose={toggleLeftDrawer} closeLabel="关闭图纸参数" />
      <div className="flex gap-1 px-3 py-2.5 border-b border-slate-200/40 shrink-0 overflow-x-auto scrollbar-dark">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setLeftDrawerTab(t.id)}
            className={`h-8 px-3 text-[13px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id ? 'bg-[#E8570A] text-white shadow-sm' : 'text-stone-500 hover:bg-stone-100'}`}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
        {activeTab === 'spec' && <SpecSection />}
        {activeTab === 'adjust' && <AdjustSection />}
        {activeTab === 'ai' && <AiSection onTriggerEnhance={onTriggerEnhance} />}
        {activeTab === 'trim' && <TrimSection />}
        {activeTab === 'view' && <ViewSection />}
      </div>
    </aside>
  );
}
