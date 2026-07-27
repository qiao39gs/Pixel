import React from 'react';
import { AlertCircle, CheckCircle2, CloudCog } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function ProjectStatus() {
  const currentProjectName = useWorkspaceStore(s => s.currentProjectName);
  const isDirty = useWorkspaceStore(s => s.isDirty);
  const saveStatus = useWorkspaceStore(s => s.saveStatus);
  const lastSavedAt = useWorkspaceStore(s => s.lastSavedAt);

  const Icon = saveStatus === 'error' ? AlertCircle : saveStatus === 'saving' ? CloudCog : CheckCircle2;
  const status = saveStatus === 'saving' ? '保存中' : saveStatus === 'error' ? '保存失败' : isDirty ? '未保存' : lastSavedAt ? `${lastSavedAt} 已保存` : '已保存';

  return (
    <div className="absolute left-3 top-3 z-40 hidden lg:flex max-w-[240px] h-10 items-center gap-2 rounded-xl border border-white/[0.06] bg-[#1E1C1B]/90 px-3 text-stone-200 shadow-lg backdrop-blur-xl">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${saveStatus === 'error' ? 'text-red-400' : isDirty ? 'text-amber-400' : 'text-emerald-400'} ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} />
      <span className="truncate text-[12px] font-bold">{currentProjectName || '未命名项目'}</span>
      <span className="shrink-0 text-[10px] text-stone-400">{status}</span>
    </div>
  );
}
