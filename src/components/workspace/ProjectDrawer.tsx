import React from 'react';
import { X, FolderKanban } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import ProjectPanel from './ProjectPanel';

interface Props {
  onReset: () => void;
  croppedImageDataUrl: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string, ar: '1:1' | '4:3' | 'auto') => void;
}

export default function ProjectDrawer({ onReset, croppedImageDataUrl, aspectRatio, onRestoreImage }: Props) {
  const open = useWorkspaceStore(s => s.projectPanelOpen);
  const toggle = useWorkspaceStore(s => s.toggleProjectPanel);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={toggle} />
      <div className="relative ml-3 mt-16 mb-3 w-[92vw] max-w-[420px] max-h-[calc(100dvh-80px)] flex flex-col glass-panel rounded-2xl overflow-hidden animate-drawer-left">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <FolderKanban className="w-4 h-4 text-slate-400" />
            <span className="font-sans font-bold text-sm">项目</span>
          </div>
          <button onClick={toggle} className="p-2 -m-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
          <ProjectPanel onReset={onReset} croppedImageDataUrl={croppedImageDataUrl} aspectRatio={aspectRatio} onRestoreImage={onRestoreImage} />
        </div>
      </div>
    </div>
  );
}